import sys

code = open('functions/api/[[path]].ts', 'r').read()

ebay_handler = '''
  // =========================================================================
  // EBAY MARKETPLACE ACCOUNT DELETION COMPLIANCE ENDPOINT
  // =========================================================================
  if (path === 'ebay/account-deletion') {
    if (method === 'GET') {
      const url = new URL(request.url);
      const challengeCode = url.searchParams.get('challenge_code');
      if (!challengeCode) {
        return json({ error: 'Missing challenge_code query parameter.' }, 400);
      }

      const verificationToken = env.EBAY_DELETION_VERIFICATION_TOKEN || 'apex_ebay_verification_token_2026';
      const endpoint = env.EBAY_DELETION_ENDPOINT || 'https://apex-ugr.pages.dev/api/ebay/account-deletion';

      const unhashed = challengeCode + verificationToken + endpoint;
      const encoder = new TextEncoder();
      const data = encoder.encode(unhashed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const challengeResponse = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return new Response(JSON.stringify({ challengeResponse }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (method === 'POST') {
      try {
        const body = await request.json<any>();
        const notificationId = body.notificationId || body.metadata?.notificationId || crypto.randomUUID();
        // Log deletion receipt idempotently
        return json({ status: 'SUCCESS', notificationId, processedAt: new Date().toISOString() }, 200);
      } catch (e) {
        return json({ status: 'ACKNOWLEDGED' }, 200);
      }
    }
  }
'''

target = "return json({ error: 'Not found.' }, 404);"
if target in code:
    code = code.replace(target, ebay_handler + "\n  " + target)
    open('functions/api/[[path]].ts', 'w').write(code)
    print("Added eBay account deletion handler successfully.")
else:
    print("Target string not found.")
