import { and, asc, count, eq, gt, or } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { SessionUser } from '../auth/session';
import type { Db } from '../db/client';
import { bookings, businesses, services, type Service } from '../db/schema';
import { AppError } from '../errors';
import { assertOwner, requireRole } from '../http/guards';
import { errorResponse } from '../http/openapi';
import { sessionUser } from '../http/session-user';

const price = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, 'Expected a price such as 1500 or 1500.00');
const name = z.string().trim().min(1).max(120);
const description = z.string().trim().max(2000);
const durationMinutes = z.number().int().min(1).max(1440);
const capacity = z.number().int().min(1).max(1000);

const createBody = z
  .object({
    name,
    description: description.optional(),
    price,
    durationMinutes,
    capacity,
  })
  .meta({
    id: 'CreateServiceRequest',
    example: { name: 'Haircut', description: 'Classic men’s haircut', price: '1500.00', durationMinutes: 60, capacity: 2 },
  });

const updateBody = z
  .object({
    name: name.optional(),
    description: description.nullable().optional(),
    price: price.optional(),
    durationMinutes: durationMinutes.optional(),
    capacity: capacity.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Send at least one field to change')
  .meta({ id: 'UpdateServiceRequest', example: { price: '1700.00', capacity: 3 } });

const idParams = z.object({ id: z.uuid() });

const serviceData = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.string(),
  durationMinutes: z.number(),
  capacity: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const serviceEnvelope = z.object({ data: serviceData }).meta({ id: 'ServiceResponse' });

export function toService(row: Service) {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    description: row.description,
    price: row.price,
    durationMinutes: row.durationMinutes,
    capacity: row.capacity,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function ownerServiceRoutes(deps: { db: Db }) {
  const { db } = deps;

  const ownBusiness = async (owner: SessionUser) => {
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, owner.id));
    if (!business) throw new AppError('NOT_FOUND', 'Register your business first');
    return business;
  };

  const loadOwned = async (owner: SessionUser, serviceId: string) => {
    const [row] = await db
      .select({ service: services, ownerId: businesses.ownerId })
      .from(services)
      .innerJoin(businesses, eq(businesses.id, services.businessId))
      .where(eq(services.id, serviceId));
    if (!row) throw new AppError('NOT_FOUND', 'Service not found');
    assertOwner(row.ownerId, owner);
    return row.service;
  };

  const assertCapacityFits = async (service: Service, newCapacity: number, now = new Date()) => {
    if (newCapacity >= service.capacity) return;
    const [upcoming] = await db
      .select({ n: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.serviceId, service.id),
          gt(bookings.endAt, now),
          or(eq(bookings.status, 'CONFIRMED'), and(eq(bookings.status, 'PENDING'), gt(bookings.expiresAt, now))),
        ),
      );
    if ((upcoming?.n ?? 0) > 0) {
      throw new AppError('CAPACITY_EXCEEDED', 'Capacity cannot be lowered while the service has upcoming bookings');
    }
  };

  return new Elysia({ prefix: '/owner/services' })
    .use(sessionUser(db))
    .post(
      '/',
      async ({ body, user, set }) => {
        const owner = requireRole(user, 'BUSINESS_OWNER');
        const business = await ownBusiness(owner);
        if (business.approvalStatus !== 'APPROVED') {
          throw new AppError('BUSINESS_NOT_APPROVED', 'Your business has to be approved before you can add services');
        }
        const [created] = await db
          .insert(services)
          .values({
            businessId: business.id,
            name: body.name,
            description: body.description ?? null,
            price: body.price,
            durationMinutes: body.durationMinutes,
            capacity: body.capacity,
          })
          .returning();
        if (!created) throw new AppError('INTERNAL_ERROR', 'Service was not created');
        set.status = 201;
        return { data: toService(created) };
      },
      {
        body: createBody,
        detail: {
          tags: ['Services'],
          summary: 'Add a service',
          description:
            'Only for an approved business. Price is a decimal string, duration is in minutes, capacity is how many customers can be served at the same time.',
        },
        response: {
          201: serviceEnvelope,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          422: errorResponse,
        },
      },
    )
    .get(
      '/',
      async ({ user }) => {
        const owner = requireRole(user, 'BUSINESS_OWNER');
        const rows = await db
          .select({ service: services })
          .from(services)
          .innerJoin(businesses, eq(businesses.id, services.businessId))
          .where(eq(businesses.ownerId, owner.id))
          .orderBy(asc(services.createdAt));
        return { data: rows.map((r) => toService(r.service)) };
      },
      {
        detail: {
          tags: ['Services'],
          summary: 'My services',
          description: 'All services of the logged-in owner’s business, including deactivated ones.',
        },
        response: { 200: z.object({ data: z.array(serviceData) }), 401: errorResponse, 403: errorResponse },
      },
    )
    .patch(
      '/:id',
      async ({ params, body, user }) => {
        const owner = requireRole(user, 'BUSINESS_OWNER');
        const current = await loadOwned(owner, params.id);
        if (body.capacity !== undefined) await assertCapacityFits(current, body.capacity);

        const changes: Partial<typeof services.$inferInsert> = { updatedAt: new Date() };
        if (body.name !== undefined) changes.name = body.name;
        if (body.description !== undefined) changes.description = body.description;
        if (body.price !== undefined) changes.price = body.price;
        if (body.durationMinutes !== undefined) changes.durationMinutes = body.durationMinutes;
        if (body.capacity !== undefined) changes.capacity = body.capacity;
        if (body.isActive !== undefined) changes.isActive = body.isActive;

        const [updated] = await db.update(services).set(changes).where(eq(services.id, current.id)).returning();
        if (!updated) throw new AppError('INTERNAL_ERROR', 'Service was not updated');
        return { data: toService(updated) };
      },
      {
        params: idParams,
        body: updateBody,
        detail: {
          tags: ['Services'],
          summary: 'Edit a service',
          description:
            'Changes the given fields. A new duration only affects future bookings. Capacity cannot be lowered while there are upcoming bookings. Send isActive true to bring a deactivated service back.',
        },
        response: {
          200: serviceEnvelope,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          422: errorResponse,
        },
      },
    )
    .delete(
      '/:id',
      async ({ params, user }) => {
        const owner = requireRole(user, 'BUSINESS_OWNER');
        const current = await loadOwned(owner, params.id);
        const [updated] = await db
          .update(services)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(services.id, current.id))
          .returning();
        if (!updated) throw new AppError('INTERNAL_ERROR', 'Service was not updated');
        return { data: toService(updated) };
      },
      {
        params: idParams,
        detail: {
          tags: ['Services'],
          summary: 'Deactivate a service',
          description:
            'The service disappears from the public catalog and cannot be booked any more. Nothing is deleted, so existing bookings keep their history.',
        },
        response: { 200: serviceEnvelope, 401: errorResponse, 403: errorResponse, 404: errorResponse, 422: errorResponse },
      },
    );
}
