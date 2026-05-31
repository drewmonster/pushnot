const baseUrl = process.env.ADMIN_API_URL || process.env.API_URL || "http://localhost:4000";
const url = new URL("/health", baseUrl);

try {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));

  console.log(JSON.stringify(body, null, 2));

  if (!response.ok || body.status === "error") {
    process.exit(1);
  }
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "error",
        url: url.toString(),
        error: error instanceof Error ? error.message : "Unknown healthcheck failure"
      },
      null,
      2
    )
  );
  process.exit(1);
}
