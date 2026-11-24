import { and, count, desc, eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { z } from 'zod';
import { toBusiness } from '../business/routes';
import type { Db } from '../db/client';
import { adminActions, businesses, users } from '../db/schema';
import { AppError } from '../errors';
import { requireRole } from '../http/guards';
import { errorResponse } from '../http/openapi';
import { offsetOf, pageEnvelope, pagingQuery } from '../http/pagination';
import { sessionUser } from '../http/session-user';
import type { SessionUser } from '../auth/session';

const adminBusiness = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  timezone: z.string(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  createdAt: z.string(),
  owner: z.object({ id: z.string(), name: z.string(), email: z.string() }),
});

const listQuery = pagingQuery.extend({ approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() });
const idParams = z.object({ id: z.uuid() });
const approveBody = z.object({ reason: z.string().trim().max(500).optional() }).optional();
const rejectBody = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .meta({ id: 'RejectBusinessRequest', example: { reason: 'The description is incomplete, please add what you offer' } });

async function decideBusiness(
  db: Db,
  admin: SessionUser,
  businessId: string,
  decision: 'APPROVE' | 'REJECT',
  reason: string,
) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(businesses)
      .set({ approvalStatus: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED' })
      .where(and(eq(businesses.id, businessId), eq(businesses.approvalStatus, 'PENDING')))
      .returning();
    if (!updated) {
      const [exists] = await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.id, businessId));
      if (!exists) throw new AppError('NOT_FOUND', 'Business not found');
      throw new AppError('CONFLICT', 'This business is not waiting for approval');
    }
    await tx.insert(adminActions).values({
      adminId: admin.id,
      actionType: decision === 'APPROVE' ? 'APPROVE_BUSINESS' : 'REJECT_BUSINESS',
      targetType: 'BUSINESS',
      targetId: businessId,
      reason,
    });
    return updated;
  });
}

export function adminBusinessRoutes(deps: { db: Db }) {
  const { db } = deps;

  const withOwner = async (businessId: string) => {
    const [row] = await db
      .select({ business: businesses, owner: { id: users.id, name: users.name, email: users.email } })
      .from(businesses)
      .innerJoin(users, eq(users.id, businesses.ownerId))
      .where(eq(businesses.id, businessId));
    if (!row) throw new AppError('NOT_FOUND', 'Business not found');
    return { ...toBusiness(row.business), owner: row.owner };
  };

  return new Elysia({ prefix: '/admin/businesses' })
    .use(sessionUser(db))
    .get(
      '/',
      async ({ query, user }) => {
        requireRole(user, 'ADMIN');
        const where = query.approvalStatus ? eq(businesses.approvalStatus, query.approvalStatus) : undefined;
        const rows = await db
          .select({ business: businesses, owner: { id: users.id, name: users.name, email: users.email } })
          .from(businesses)
          .innerJoin(users, eq(users.id, businesses.ownerId))
          .where(where)
          .orderBy(desc(businesses.createdAt))
          .limit(query.limit)
          .offset(offsetOf(query.page, query.limit));
        const [total] = await db.select({ n: count() }).from(businesses).where(where);
        return {
          data: rows.map((r) => ({ ...toBusiness(r.business), owner: r.owner })),
          pagination: { page: query.page, limit: query.limit, total: total?.n ?? 0 },
        };
      },
      {
        query: listQuery,
        detail: {
          tags: ['Admin'],
          summary: 'List businesses',
          description: 'Administrators see every business, newest first, and can filter by approval status.',
        },
        response: { 200: pageEnvelope(adminBusiness), 401: errorResponse, 403: errorResponse, 422: errorResponse },
      },
    )
    .post(
      '/:id/approve',
      async ({ params, body, user }) => {
        const admin = requireRole(user, 'ADMIN');
        await decideBusiness(db, admin, params.id, 'APPROVE', body?.reason || 'Approved');
        return { data: await withOwner(params.id) };
      },
      {
        params: idParams,
        body: approveBody,
        detail: {
          tags: ['Admin'],
          summary: 'Approve a business',
          description: 'Publishes a business that is waiting for approval and records the decision in the audit log.',
        },
        response: {
          200: z.object({ data: adminBusiness }),
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          422: errorResponse,
        },
      },
    )
    .post(
      '/:id/reject',
      async ({ params, body, user }) => {
        const admin = requireRole(user, 'ADMIN');
        await decideBusiness(db, admin, params.id, 'REJECT', body.reason);
        return { data: await withOwner(params.id) };
      },
      {
        params: idParams,
        body: rejectBody,
        detail: {
          tags: ['Admin'],
          summary: 'Reject a business',
          description: 'Rejects a business that is waiting for approval. A reason is required and the owner can read it.',
        },
        response: {
          200: z.object({ data: adminBusiness }),
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          422: errorResponse,
        },
      },
    );
}
