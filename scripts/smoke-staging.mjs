const apiUrl = normalizeUrl(
  process.env.STAGING_API_URL || process.env.ADMIN_API_URL || process.env.API_URL
);
const adminToken = process.env.ADMIN_API_TOKEN;
const tenantId = process.env.STAGING_TENANT_ID || process.env.DEMO_TENANT_ID || "demo-tenant";

if (!apiUrl) {
  fail("Set STAGING_API_URL, ADMIN_API_URL, or API_URL to the public staging API URL.");
}

if (["localhost", "127.0.0.1", "::1"].includes(apiUrl.hostname)) {
  fail(`Smoke staging must target a non-localhost API URL. Got ${apiUrl.toString()}`);
}

if (!adminToken) {
  fail("Set ADMIN_API_TOKEN for smoke:staging.");
}

const checks = [];

checks.push(
  check("GET /health", async () => {
    const response = await request("/health");
    const body = await response.json();
    assert(response.ok, `Expected 2xx, got ${response.status}`);
    assert(body.status === "ok" || body.status === "degraded", `Unexpected health status: ${body.status}`);
    assert(body.postgres?.status === "ok", "Postgres is not ok");
    assert(body.redis?.status === "ok", "Redis is not ok");
    assert(body.queue?.status === "ok", "Queue is not ok");
  })
);

checks.push(
  check("admin endpoint rejects missing token", async () => {
    const response = await request(`/tenants`);
    assert(response.status === 401, `Expected 401, got ${response.status}`);
  })
);

checks.push(
  check("admin endpoint accepts valid token", async () => {
    const response = await request(`/tenants`, {
      headers: { "x-admin-token": adminToken }
    });
    assert(response.ok, `Expected 2xx, got ${response.status}`);
  })
);

checks.push(
  check("device register rejects missing appPublicKey", async () => {
    const response = await request("/devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(devicePayload({ appPublicKey: undefined }))
    });
    assert(response.status === 400, `Expected 400, got ${response.status}`);
  })
);

checks.push(
  check("device register rejects invalid appPublicKey", async () => {
    const response = await request("/devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(devicePayload({ appPublicKey: "invalid-public-key" }))
    });
    assert(response.status === 401, `Expected 401, got ${response.status}`);
  })
);

const results = await Promise.all(checks);
const failed = results.filter((result) => !result.ok);

for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.error ? `: ${result.error}` : ""}`);
}

if (failed.length > 0) {
  process.exit(1);
}

function normalizeUrl(value) {
  if (!value) {
    return null;
  }

  return new URL(value);
}

async function check(name, fn) {
  try {
    await fn();
    return { name, ok: true };
  } catch (error) {
    return {
      name,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function request(path, init) {
  return fetch(new URL(path, apiUrl), {
    ...init,
    cache: "no-store"
  });
}

function devicePayload({ appPublicKey }) {
  const payload = {
    tenantId,
    appPublicKey,
    deviceId: `smoke-${Date.now()}`,
    pushToken: "ExponentPushToken[smoke]",
    platform: "android",
    appVersion: "smoke",
    locale: "en-US",
    timezone: "UTC",
    consentStatus: "active"
  };

  if (!appPublicKey) {
    delete payload.appPublicKey;
  }

  return payload;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
