import { z } from "zod";

// Fails fast on boot if required env vars are missing — better than a
// runtime null-pointer three requests into a shift.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Pooled connection (Supavisor transaction mode) — needs ?pgbouncer=true
  // so Prisma disables prepared statements, which transaction poolers don't support.
  DATABASE_URL: z.string().url(),
  // Direct, unpooled connection. Prisma migrations must not go through the
  // pooler; this is what prisma/schema.prisma's directUrl points at.
  DIRECT_URL: z.string().url().optional(),

  JWT_SECRET: z.string().min(1),

  QUEUE_DRIVER: z.enum(["postgres", "sqs"]).default("postgres"),
  AWS_REGION: z.string().default("af-south-1"),
  SQS_QUEUE_URL: z.string().optional(),

  TWILIO_AUTH_TOKEN: z.string().min(1),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),

  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
