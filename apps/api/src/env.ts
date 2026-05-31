import "dotenv/config";
import { z } from "zod";

const optionalNumberFromEnv = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().optional()
);

const optionalStringFromEnv = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: optionalStringFromEnv,
  PORT: optionalNumberFromEnv,
  API_PORT: z.coerce.number().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  ADMIN_ORIGIN: optionalStringFromEnv,
  PUSH_PROVIDER: z.enum(["expo", "mock"]).default("expo"),
  PUSH_MOCK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  ADMIN_ACTOR_ID: z.string().default("local-admin"),
  ADMIN_API_TOKEN: z.string().optional()
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === "production") {
  const missing = [
    ["ADMIN_API_TOKEN", parsed.ADMIN_API_TOKEN],
    ["DATABASE_URL", parsed.DATABASE_URL],
    ["REDIS_URL", parsed.REDIS_URL],
    ["PUSH_PROVIDER", parsed.PUSH_PROVIDER]
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing required production env vars: ${missing.map(([key]) => key).join(", ")}`);
  }
}

export const env = {
  ...parsed,
  API_PORT: parsed.PORT ?? parsed.API_PORT,
  ADMIN_API_TOKEN: parsed.ADMIN_API_TOKEN ?? "local-admin-api-token"
};
