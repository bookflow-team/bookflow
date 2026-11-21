import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['CUSTOMER', 'BUSINESS_OWNER', 'ADMIN']);
export const approvalStatusEnum = pgEnum('approval_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const bookingStatusEnum = pgEnum('booking_status', [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED',
]);
export const exceptionTypeEnum = pgEnum('exception_type', ['CLOSED', 'OPEN']);
export const blockReasonEnum = pgEnum('block_reason', ['EXTERNAL_BOOKING', 'UNAVAILABLE']);
export const adminActionTypeEnum = pgEnum('admin_action_type', [
  'APPROVE_BUSINESS',
  'REJECT_BUSINESS',
  'CANCEL_BOOKING',
]);
export const adminTargetTypeEnum = pgEnum('admin_target_type', ['BUSINESS', 'BOOKING']);

const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const pk = () => uuid('id').primaryKey().defaultRandom();

export const users = pgTable(
  'users',
  {
    id: pk(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone'),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull(),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [
    check('users_email_lowercase', sql`${t.email} = lower(${t.email})`),
    check('users_name_nonempty', sql`length(trim(${t.name})) > 0`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: tstz('expires_at').notNull(),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
);

export const businesses = pgTable(
  'businesses',
  {
    id: pk(),
    ownerId: uuid('owner_id')
      .notNull()
      .unique()
      .references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    timezone: text('timezone').notNull(),
    approvalStatus: approvalStatusEnum('approval_status').notNull().default('PENDING'),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('businesses_approval_idx').on(t.approvalStatus),
    check('businesses_name_nonempty', sql`length(trim(${t.name})) > 0`),
  ],
);

export const services = pgTable(
  'services',
  {
    id: pk(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    name: text('name').notNull(),
    description: text('description'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    capacity: integer('capacity').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: tstz('created_at').notNull().defaultNow(),
    updatedAt: tstz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('services_business_idx').on(t.businessId),
    check('services_name_nonempty', sql`length(trim(${t.name})) > 0`),
    check('services_price_nonnegative', sql`${t.price} >= 0`),
    check('services_duration_range', sql`${t.durationMinutes} between 1 and 1440`),
    check('services_capacity_positive', sql`${t.capacity} > 0`),
  ],
);

export const serviceSchedules = pgTable(
  'service_schedules',
  {
    id: pk(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    weekday: smallint('weekday').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (t) => [
    index('service_schedules_lookup_idx').on(t.serviceId, t.weekday),
    check('service_schedules_weekday_range', sql`${t.weekday} between 1 and 7`),
    check('service_schedules_interval', sql`${t.endTime} > ${t.startTime}`),
  ],
);

export const availabilityExceptions = pgTable(
  'availability_exceptions',
  {
    id: pk(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    startAt: tstz('start_at').notNull(),
    endAt: tstz('end_at').notNull(),
    type: exceptionTypeEnum('type').notNull(),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('availability_exceptions_range_idx').on(t.serviceId, t.startAt, t.endAt),
    check('availability_exceptions_interval', sql`${t.endAt} > ${t.startAt}`),
  ],
);

export const bookings = pgTable(
  'bookings',
  {
    id: pk(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    startAt: tstz('start_at').notNull(),
    endAt: tstz('end_at').notNull(),
    status: bookingStatusEnum('status').notNull().default('PENDING'),
    expiresAt: tstz('expires_at').notNull(),
    priceAtBooking: numeric('price_at_booking', { precision: 10, scale: 2 }).notNull(),
    statusReason: text('status_reason'),
    cancelledBy: userRoleEnum('cancelled_by'),
    createdAt: tstz('created_at').notNull().defaultNow(),
    updatedAt: tstz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('bookings_service_occupancy_idx')
      .on(t.serviceId, t.startAt, t.endAt)
      .where(sql`${t.status} in ('PENDING', 'CONFIRMED')`),
    index('bookings_customer_idx').on(t.customerId, t.startAt),
    index('bookings_status_expiry_idx').on(t.status, t.expiresAt),
    check('bookings_interval', sql`${t.endAt} > ${t.startAt}`),
    check('bookings_expiry_not_after_start', sql`${t.expiresAt} <= ${t.startAt}`),
  ],
);

export const timeBlocks = pgTable(
  'time_blocks',
  {
    id: pk(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    startAt: tstz('start_at').notNull(),
    endAt: tstz('end_at').notNull(),
    units: integer('units').notNull(),
    reason: blockReasonEnum('reason').notNull(),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('time_blocks_range_idx').on(t.serviceId, t.startAt, t.endAt),
    check('time_blocks_interval', sql`${t.endAt} > ${t.startAt}`),
    check('time_blocks_units_positive', sql`${t.units} > 0`),
  ],
);

export const adminActions = pgTable(
  'admin_actions',
  {
    id: pk(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => users.id),
    actionType: adminActionTypeEnum('action_type').notNull(),
    targetType: adminTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason').notNull(),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('admin_actions_admin_idx').on(t.adminId, t.createdAt),
    index('admin_actions_target_idx').on(t.targetType, t.targetId),
    check('admin_actions_reason_nonempty', sql`length(trim(${t.reason})) > 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type TimeBlock = typeof timeBlocks.$inferSelect;
