// Minimal Expo push dispatch. Best-effort only: a delivery failure here must
// never break the caller's core flow (bounty scheduling, escalation, etc.),
// so every entry point swallows its own errors.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo's push API accepts at most 100 messages per call.

export async function tokensForUsers(env, userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await env.DB.prepare(`SELECT user_id,token FROM push_tokens WHERE user_id IN (${placeholders})`).bind(...ids).all();
  return rows.results || [];
}

export async function sendPushToUsers(env, userIds, { title, body, data } = {}) {
  try {
    const tokens = await tokensForUsers(env, userIds);
    if (!tokens.length) return { sent: 0 };
    return await sendPushMessages(tokens.map(row => ({ to: row.token, title, body, data, sound: 'default' })));
  } catch {
    // Never let a push failure interrupt the caller.
    return { sent: 0, error: true };
  }
}

export async function sendPushToAll(env, { title, body, data } = {}) {
  try {
    const rows = await env.DB.prepare('SELECT token FROM push_tokens').all();
    const tokens = rows.results || [];
    if (!tokens.length) return { sent: 0 };
    return await sendPushMessages(tokens.map(row => ({ to: row.token, title, body, data, sound: 'default' })));
  } catch {
    return { sent: 0, error: true };
  }
}

async function sendPushMessages(messages) {
  let sent = 0;
  for (let index = 0; index < messages.length; index += CHUNK_SIZE) {
    const chunk = messages.slice(index, index + CHUNK_SIZE);
    try {
      const request = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (request.ok) sent += chunk.length;
    } catch {
      // Try the next chunk; a transient failure on one batch shouldn't
      // abort delivery to the rest.
    }
  }
  return { sent };
}
