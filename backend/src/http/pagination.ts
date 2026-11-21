import { z } from 'zod';

export const pagingQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const offsetOf = (page: number, limit: number) => (page - 1) * limit;

export const pageEnvelope = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    pagination: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
  });
