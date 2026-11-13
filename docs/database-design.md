
# BookFlow — Database Design

## 1. Overview

BookFlow uses PostgreSQL as its relational database and Drizzle ORM for database access and migrations.

The database supports three user roles:
- CUSTOMER
- BUSINESS_OWNER
- ADMIN

The MVP supports one business per business owner account, independent capacity per service, manual booking approval, and anonymous external capacity blocks.

## 2. Core Tables

### 2.1 users

Stores user accounts and authentication information.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique, not null |
| password_hash | TEXT | Not null |
| role | VARCHAR(20) | Not null |
| created_at | TIMESTAMPTZ | Not null |

Allowed roles:
- CUSTOMER
- BUSINESS_OWNER
- ADMIN

Passwords must be securely hashed. Plaintext passwords must never be stored.

### 2.2 businesses

Stores registered businesses and their approval status.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| owner_id | UUID | FK to users.id, unique |
| name | VARCHAR(150) | Not null |
| description | TEXT | Nullable |
| timezone | VARCHAR(64) | Not null |
| approval_status | VARCHAR(20) | Not null |
| created_at | TIMESTAMPTZ | Not null |

Allowed approval statuses:
- PENDING
- APPROVED
- REJECTED

Each business belongs to exactly one business owner.

A business owner may register only one business.

Only approved businesses can publish services and receive booking requests.

### 2.3 services

Stores the services offered by approved businesses.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| business_id | UUID | FK to businesses.id |
| name | VARCHAR(150) | Not null |
| description | TEXT | Nullable |
| price | NUMERIC(10,2) | Not null |
| duration_minutes | INTEGER | Greater than 0 |
| capacity | INTEGER | Greater than 0 |
| is_active | BOOLEAN | Default true |

Each service has its own independent capacity.

Service capacity is not shared with other services.

### 2.4 service_schedules

Defines recurring weekly availability.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| service_id | UUID | FK to services.id |
| weekday | INTEGER | 1–7 (Monday–Sunday) |
| start_time | TIME | Not null |
| end_time | TIME | Not null |

The end time must be later than the start time.

A service may have multiple schedule intervals per day.

Schedule times are interpreted in the business's configured time zone.

### 2.5 availability_exceptions

Defines temporary closures or changes to normal availability.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| service_id | UUID | FK to services.id |
| start_at | TIMESTAMPTZ | Not null |
| end_at | TIMESTAMPTZ | Not null |
| type | VARCHAR(20) | Not null |

Allowed types:
- CLOSED
- OPEN

An exception may close an otherwise available period or add an exceptional opening period.

Overlapping or contradictory exceptions must be rejected or resolved using a documented precedence rule.

### 2.6 bookings

Stores customer appointment requests and their states.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| customer_id | UUID | FK to users.id |
| service_id | UUID | FK to services.id |
| start_at | TIMESTAMPTZ | Not null |
| end_at | TIMESTAMPTZ | Not null |
| status | VARCHAR(20) | Not null |
| expires_at | TIMESTAMPTZ | Not null |
| created_at | TIMESTAMPTZ | Not null |
| updated_at | TIMESTAMPTZ | Not null |

Allowed statuses:
- PENDING
- CONFIRMED
- REJECTED
- CANCELLED
- EXPIRED
- COMPLETED

PENDING and CONFIRMED bookings consume capacity.

The backend must validate the service duration, schedule, capacity, and booking rules before creating or modifying a booking.

A pending booking expires at the earlier of:
- 24 hours after its creation.
- The appointment start time.

An expired booking must no longer consume capacity, even if its stored status has not yet been updated by a background job.

### 2.7 time_blocks

Stores capacity blocked by businesses for external appointments or temporary unavailability.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| service_id | UUID | FK to services.id |
| start_at | TIMESTAMPTZ | Not null |
| end_at | TIMESTAMPTZ | Not null |
| units | INTEGER | Greater than 0 |
| reason | VARCHAR(30) | Not null |
| created_at | TIMESTAMPTZ | Not null |

Allowed reasons:
- EXTERNAL_BOOKING
- UNAVAILABLE

External bookings do not require customer accounts or personal customer records.

A block reduces the available capacity of the corresponding service during its entire interval.

### 2.8 admin_actions

Stores administrative interventions for auditing.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | Primary key |
| admin_id | UUID | FK to users.id |
| action_type | VARCHAR(50) | Not null |
| target_type | VARCHAR(30) | Not null |
| target_id | UUID | Not null |
| reason | TEXT | Not null |
| created_at | TIMESTAMPTZ | Not null |

Example actions:
- APPROVE_BUSINESS
- REJECT_BUSINESS
- CANCEL_BOOKING

Administrative interventions must include a reason and the administrator responsible.

## 3. Entity Relationships

- One User may own zero or one Business.
- One Business belongs to one User.
- One Business has many Services.
- One Service has many Service Schedules.
- One Service has many Availability Exceptions.
- One Service has many Bookings.
- One Customer may have many Bookings.
- One Service has many Time Blocks.
- One Administrator may create many Admin Actions.

Foreign keys must enforce referential integrity.

## 4. Booking Capacity Rules

Capacity is calculated independently for each service.

For a requested appointment interval, the backend must count:

1. Active PENDING bookings whose expiration time has not passed.
2. CONFIRMED bookings.
3. External time blocks and other capacity blocks overlapping the interval.

Intervals overlap when:

existing.start_at < requested.end_at
AND
existing.end_at > requested.start_at

The total occupied capacity must never exceed the service's configured capacity at any instant within the requested interval.

For example:

Service capacity: 3

- Confirmed bookings: 1
- Active pending bookings: 1
- External blocked units: 1

Remaining capacity: 0

Bookings and blocks must be checked across their entire duration, not only at their starting time.

## 5. Concurrency Control

A simple availability query followed by an INSERT is not sufficient to prevent overbooking.

Booking creation must use a PostgreSQL transaction and a consistent locking strategy.

Recommended MVP approach:

1. Begin a transaction.
2. Lock the corresponding service row using SELECT ... FOR UPDATE.
3. Recalculate availability and occupied capacity.
4. Validate the requested interval.
5. Insert the PENDING booking.
6. Commit the transaction.

All operations that affect capacity must use the same locking strategy, including:

- Booking creation.
- Booking approval or rejection.
- Booking cancellation.
- External block creation or modification.
- Service capacity reduction.

Expired pending bookings must be excluded from occupancy calculations.

If validation fails, the transaction must roll back.

## 6. Booking State Transitions

Allowed transitions:

- PENDING -> CONFIRMED
- PENDING -> REJECTED
- PENDING -> CANCELLED
- PENDING -> EXPIRED
- CONFIRMED -> CANCELLED
- CONFIRMED -> COMPLETED

Terminal states:
- REJECTED
- CANCELLED
- EXPIRED
- COMPLETED

Only the authorized actor may perform each transition.

Customers may cancel confirmed bookings at least 12 hours before the appointment.

Business owners may cancel confirmed bookings at least 6 hours before the appointment.

Administrators may cancel problematic bookings with a recorded justification.

## 7. Database Constraints

The implementation should enforce:

- Unique user emails.
- One business per owner.
- Positive service duration.
- Positive service capacity.
- Non-negative service price.
- Positive time-block units.
- Valid schedule weekdays.
- Valid interval boundaries.
- Valid roles and status values.
- Foreign-key integrity.
- Required administrative reasons.

Business-specific authorization and aggregate capacity constraints must also be enforced by the backend.

## 8. Recommended Indexes

- users(email): UNIQUE
- businesses(owner_id): UNIQUE
- businesses(approval_status)
- services(business_id)
- service_schedules(service_id, weekday)
- availability_exceptions(service_id, start_at, end_at)
- bookings(service_id, start_at, end_at)
- bookings(customer_id, start_at)
- bookings(status, expires_at)
- time_blocks(service_id, start_at, end_at)
- admin_actions(admin_id, created_at)

Index selection should be reviewed after implementing the main queries.

## 9. Data Integrity and Security

- Store appointment timestamps in TIMESTAMPTZ.
- Store business time zones using IANA identifiers.
- Do not store plaintext passwords.
- Never expose password hashes through API responses.
- Enforce role and ownership checks in the backend.
- Do not expose private booking information to unrelated businesses.
- Use database migrations for schema changes.
- Keep credentials outside the repository.
- Preserve booking history when services are deactivated.
- Record administrative interventions for auditing.

## 10. Implementation Notes

This document defines the proposed logical database model.

The backend developer will translate it into Drizzle ORM schemas and PostgreSQL migrations.

Minor implementation changes are allowed if they preserve the approved business requirements.

Any change affecting API contracts, booking capacity, user permissions, or reservation states must be discussed with the team before implementation.
