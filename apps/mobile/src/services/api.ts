const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? process.env.MOBILE_API_URL ?? "http://localhost:4000";

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
