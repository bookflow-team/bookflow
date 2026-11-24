import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BACKEND_HOST: z.string().min(1).default('0.0.0.0'),
  BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  CORS_ORIGIN: z
    .url({ protocol: /^https?$/ })
    .refine((v) => !v.endsWith('/'), 'must not end with a slash'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${problems}`);
  }
  return parsed.data;
}
