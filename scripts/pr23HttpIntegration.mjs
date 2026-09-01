import assert from "node:assert/strict";

const base = process.env.APEX_QA_URL || "http://127.0.0.1:8791/api";
const password = "Phase3-QA-Password!";

async function call(path, { token, method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("json") ? await response.json().catch(() => ({})) : await response.arrayBuffer();
  return { response, status: response.status, payload };
}

async function session() {
  const signup = await call("auth/signup", { method: "POST", body: { email: "drummerforger@gmail.com", password } });
  if (signup.status === 201) return signup.payload;
  assert.equal(signup.status, 409);
  const signin = await call("auth/signin", { method: "POST", body: { email: "drummerforger@gmail.com", password } });
  assert.equal(signin.status, 200);
  return signin.payload;
}

const owner = await session();
const invite = await call("invites", { token: owner.token, method: "POST", body: { label: "PR23 HTTP QA", maxUses: 1 } });
assert.equal(invite.status, 201);
const qaEmail = `pr23-http-${Date.now()}@example.test`;
const member = await call("auth/signup", { method: "POST", body: { email: qaEmail, password, inviteCode: invite.payload.code } });
assert.equal(member.status, 201);
const { token, user } = member.payload;

const disclaimerBefore = await call("disclaimer", { token });
assert.equal(disclaimerBefore.status, 200);
assert.equal(disclaimerBefore.payload.accepted, false);
const disclaimerAccept = await call("disclaimer/accept", { token, method: "POST", body: { userId: "spoofed-user" } });
assert.equal(disclaimerAccept.status, 200);
assert.equal(disclaimerAccept.payload.accepted, true);
const disclaimerAfter = await call("disclaimer", { token });
assert.equal(disclaimerAfter.status, 200);
assert.equal(disclaimerAfter.payload.accepted, true);
assert.ok(disclaimerAfter.payload.version);

const invalidVehicle = await call("vehicles", { token, method: "POST", body: { year: 2025, make: "Yamaha", model: "R1", vehicleType: "BOAT" } });
assert.equal(invalidVehicle.status, 400);
const motorcycle = await call("vehicles", {
  token,
  method: "POST",
  body: { nickname: "QA R1", year: 2025, make: "Yamaha", model: "R1", trim: "Base", engine: "Inline-4", drivetrain: "CHAIN", horsepower: 200, color: "Black", vehicleType: "MOTORCYCLE", displacementCc: 998 },
});
assert.equal(motorcycle.status, 201);
const vehicles = await call("vehicles", { token });
const savedBike = vehicles.payload.vehicles.find((item) => item.id === motorcycle.payload.id);
assert.equal(savedBike.vehicle_type, "MOTORCYCLE");
assert.equal(savedBike.displacement_cc, 998);

const firstMod = await call(`vehicles/${motorcycle.payload.id}/wishlist`, {
  token,
  method: "POST",
  body: { part: "Slip-on exhaust", brand: "Akrapovic", category: "Exhaust", price: 950, url: "https://example.test/exhaust", priority: "HIGH", notes: "Track-only test fixture", installed: false, sortOrder: 2 },
});
assert.equal(firstMod.status, 200);
const secondMod = await call(`vehicles/${motorcycle.payload.id}/wishlist`, {
  token,
  method: "POST",
  body: { part: "ECU flash", brand: "MoTeC", category: "Tuning", price: 650, url: "https://example.test/ecu", priority: "MEDIUM", notes: "QA installed fixture", installed: true, sortOrder: 1 },
});
assert.equal(secondMod.status, 200);
const updatedMod = await call(`vehicles/${motorcycle.payload.id}/wishlist`, {
  token,
  method: "POST",
  body: { id: firstMod.payload.id, part: "Carbon slip-on exhaust", brand: "Akrapovic", category: "Exhaust", price: 1050, url: "https://example.test/exhaust-v2", priority: "HIGH", notes: "Edited fixture", installed: true, installedAt: "2026-08-30T00:00:00.000Z", sortOrder: 0 },
});
assert.equal(updatedMod.status, 200);
const planner = await call(`vehicles/${motorcycle.payload.id}/wishlist`, { token });
assert.equal(planner.status, 200);
assert.ok(planner.payload.wishlist.some((item) => item.id === firstMod.payload.id && item.installed === 1 && item.sort_order === 0));
const deletedMod = await call(`vehicles/${motorcycle.payload.id}/wishlist/${secondMod.payload.id}`, { token, method: "DELETE" });
assert.equal(deletedMod.status, 200);
const afterDelete = await call(`vehicles/${motorcycle.payload.id}/wishlist`, { token });
assert.equal(afterDelete.payload.wishlist.some((item) => item.id === secondMod.payload.id), false);

const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50, 0, 0, 0, 0, 109, 112, 52, 50, 105, 115, 111, 109]);
const form = new FormData();
form.set("file", new File([bytes], "qa-video.mp4", { type: "video/mp4" }));
const upload = await call("upload", { token, method: "POST", body: form });
assert.equal(upload.status, 201);
assert.match(upload.payload.url, /^\/api\/media\//);
const post = await call("posts", { token, method: "POST", body: { mediaUrl: upload.payload.url, mediaType: "video", caption: "PR23 video integration" } });
assert.equal(post.status, 201);
const feed = await call("feed", { token });
assert.equal(feed.status, 200);
assert.ok(feed.payload.posts.some((item) => item.id === post.payload.id && item.media_type === "video"));

const mediaPath = upload.payload.url.replace(/^\/api\//, "");
const fullMedia = await call(mediaPath, { token });
assert.equal(fullMedia.status, 200);
assert.equal(fullMedia.response.headers.get("accept-ranges"), "bytes");
assert.equal(fullMedia.response.headers.get("content-type"), "video/mp4");
const rangedMedia = await call(mediaPath, { token, headers: { range: "bytes=0-7" } });
assert.equal(rangedMedia.status, 206);
assert.equal(rangedMedia.response.headers.get("accept-ranges"), "bytes");
assert.match(rangedMedia.response.headers.get("content-range") || "", /^bytes 0-7\/24$/);
assert.equal(rangedMedia.response.headers.get("content-length"), "8");

console.log(JSON.stringify({
  status: "pass",
  user: user.id,
  disclaimer: "server-persisted",
  motorcycle: "validated-and-persisted",
  planner: "crud-order-installed",
  socialVideo: "upload-r2-feed-range",
}));
