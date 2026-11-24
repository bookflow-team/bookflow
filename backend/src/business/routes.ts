import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../db/client';
import { isUniqueViolation } from '../db/errors';
import { businesses, type Business } from '../db/schema';
import { AppError } from '../errors';
import { requireRole } from '../http/guards';
import { errorResponse } from '../http/openapi';
import { sessionUser } from '../http/session-user';
import { isValidTimeZone } from './timezone';

const timezone = z
  .string()
  .refine(isValidTimeZone, 'Expected an IANA time zone such as Europe/Moscow or Asia/Krasnoyarsk');

const createBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional(),
    timezone,
  })
  .meta({
    id: 'CreateBusinessRequest',
    example: { name: 'Boris Barbers', description: 'Classic haircuts and shaves', timezone: 'Asia/Krasnoyarsk' },
  });

const updateBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    timezone: timezone.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Send at least one field to change')
  .meta({ id: 'UpdateBusinessRequest', example: { description: 'Haircuts, shaves and beard care' } });

const businessEnvelope = z
  .object({
    data: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      timezone: z.string(),
      approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
      createdAt: z.string(),
    }),
  })
  .meta({
    id: 'BusinessResponse',
    example: {
      data: {
        id: '9d2f6c1e-5a47-4c1b-8f3e-2b7a90c4d1e5',
        name: 'Boris Barbers',
        description: 'Classic haircuts and shaves',
        timezone: 'Asia/Krasnoyarsk',
        approvalStatus: 'PENDING',
        createdAt: '2026-11-24T08:30:00.000Z',
      },
    },
  });

export function toBusiness(row: Business) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    timezone: row.timezone,
    approvalStatus: row.approvalStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export function ownerBusinessRoutes(deps: { db: Db }) {
  const { db } = deps;

  return new Elysia({ prefix: '/owner/business' })
    .use(sessionUser(db))
    .post(
      '/',
      async ({ body, user, set }) => {
        const owner = requireRole(user, 'BUSINESS_OWNER');
        try {
          const [created] = await db
            .insert(businesses)
            .values({
              ownerId: owner.id,
              name: body.name,
              description: body.description ?? null,
              timezone: body.timezone,
            })
            .returning();
          if (!created) throw new AppError('INTERNAL_ERROR', 'Business was not created');
          set.status = 201;
          return { data: toBusiness(created) };
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new AppError('BUSINESS_ALREADY_EXISTS', 'You have already registered a business');
          }
          throw error;
        }
      },
      {
        body: createBody,
        detail: {
          tags: ['Business'],
          summary: 'Register my business',
          description:
            'Business owners can register one business. It starts as PENDING and is not public until an administrator approves it.',
        },
        response: { 201: businessEnvelope, 401: errorResponse, 403: errorResponse, 409: errorResponse, 422: errorResponse },
      },
    )
    .get(
      '/',
      async ({ user }) => {
        const owner = requireRole(user, 'BUSINESS_OWNER');
        const [row] = await db.select().from(businesses).where(eq(businesses.ownerId, owner.id));
        if (!row) throw new AppError('NOT_FOUND', 'You have not registered a business yet');
        return { data: toBusiness(row) };
      },
      {
        detail: { tags: ['Business'], summary: 'My business', description: 'Returns the business of the logged-in owner.' },
        response: { 200: businessEnvelope, 401: errorResponse, 403: errorResponse, 404: errorResponse },
      },
    )
    .patch(
      '/',
      async ({ body, user }) => {
        const owner = requireRole(user, 'BUSINESS_OWNER');
        const [current] = await db.select().from(businesses).where(eq(businesses.ownerId, owner.id));
        if (!current) throw new AppError('NOT_FOUND', 'You have not registered a business yet');

        const changes: Partial<typeof businesses.$inferInsert> = {};
        if (body.name !== undefined) changes.name = body.name;
        if (body.description !== undefined) changes.description = body.description;
        if (body.timezone !== undefined) changes.timezone = body.timezone;
        if (current.approvalStatus === 'REJECTED') changes.approvalStatus = 'PENDING';

        const [updated] = await db.update(businesses).set(changes).where(eq(businesses.id, current.id)).returning();
        if (!updated) throw new AppError('INTERNAL_ERROR', 'Business was not updated');
        return { data: toBusiness(updated) };
      },
      {
        body: updateBody,
        detail: {
          tags: ['Business'],
          summary: 'Edit my business',
          description: 'Changes the given fields. Editing a rejected business sends it back to PENDING for another review.',
        },
        response: { 200: businessEnvelope, 401: errorResponse, 403: errorResponse, 404: errorResponse, 422: errorResponse },
      },
    );
}
