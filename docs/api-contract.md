
# BookFlow — REST API Contract

**Version:** 1.0 (Draft)  
**Status:** Proposed — pending backend review  
**Base URL:** `/api/v1`  
**Content-Type:** `application/json`

## 1. Overview

This document defines the proposed REST API for BookFlow.

The API connects the React frontend to the ElysiaJS backend and PostgreSQL database.

All endpoints must validate input, enforce authorization, and return consistent JSON responses.

## 2. General Conventions

### 2.1 Authentication

Proposed mechanism: HTTP-only cookie-based sessions.

- Passwords are securely hashed.
- Session cookies use `HttpOnly` and `SameSite` attributes.
- `Secure` is enabled in HTTPS environments.
- State-changing requests must have CSRF protection appropriate to the session design.
- Frontend requests include `credentials: "include"` when required.
- The backend validates the session and user permissions.

The final authentication implementation must be confirmed by the backend developer.

### 2.2 User Roles

- `CUSTOMER`
- `BUSINESS_OWNER`
- `ADMIN`

Protected endpoints must verify the role and ownership of requested resources.

### 2.3 Response Format

Successful response:

```json
{
  "data": {
    "id": "uuid",
    "name": "Example"
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {}
  }
}
```

Collection response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

### 2.4 Common HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created |
| 204 | Successful request without response body |
| 400 | Invalid request |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict or unavailable capacity |
| 422 | Validation error |
| 429 | Too many requests |
| 500 | Internal server error |

### 2.5 Date and Time

- API timestamps use ISO 8601 with UTC offsets.
- Appointment times are stored as PostgreSQL `TIMESTAMPTZ`.
- Business time zones use IANA identifiers.
- Prices are represented as decimal strings to avoid floating-point errors.

## 3. Authentication Endpoints

### POST /auth/register

**Access:** Public

Registers a customer or business owner account.

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "role": "CUSTOMER"
}
```

Allowed registration roles:
- CUSTOMER
- BUSINESS_OWNER

Administrator accounts cannot be created through public registration.

Response: `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "CUSTOMER"
  }
}
```

### POST /auth/login

**Access:** Public

Request:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Response: `200 OK`

Returns the authenticated user and establishes a session.

### POST /auth/logout

**Access:** Authenticated

Terminates the current session.

Response: `204 No Content`

### GET /auth/me

**Access:** Authenticated

Returns the current user's ID, email, and role.

## 4. Public Business Endpoints

### GET /businesses

**Access:** Public

Returns approved businesses.

Query parameters:
- `search` (optional)
- `page` (default: 1)
- `limit` (default: 20)

### GET /businesses/:businessId

**Access:** Public

Returns an approved business's public details.

### GET /businesses/:businessId/services

**Access:** Public

Returns active services belonging to an approved business.

### GET /services/:serviceId/availability

**Access:** Public

Query parameters:
- `date` (YYYY-MM-DD)

Response:

```json
{
  "data": {
    "serviceId": "uuid",
    "date": "2026-11-20",
    "timezone": "Europe/Moscow",
    "slots": [
      {
        "startAt": "2026-11-20T09:00:00Z",
        "endAt": "2026-11-20T10:00:00Z",
        "remainingCapacity": 2
      }
    ]
  }
}
```

Availability is informative and must be revalidated when creating a booking.

## 5. Customer Endpoints

### POST /bookings

**Access:** CUSTOMER

Creates a pending booking request.

Request:

```json
{
  "serviceId": "uuid",
  "startAt": "2026-11-20T09:00:00Z"
}
```

Response: `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "serviceId": "uuid",
    "status": "PENDING",
    "startAt": "2026-11-20T09:00:00Z",
    "endAt": "2026-11-20T10:00:00Z",
    "expiresAt": "2026-11-20T09:00:00Z"
  }
}
```

The backend calculates `endAt` from the service duration and `expiresAt` from the approval deadline.

The booking must be created transactionally after checking capacity.

### GET /bookings/me

**Access:** CUSTOMER

Returns the authenticated customer's bookings.

Optional query parameters:
- `status`
- `page`
- `limit`

### GET /bookings/:bookingId

**Access:** Booking owner, corresponding business owner, or ADMIN

Returns booking details.

### POST /bookings/:bookingId/cancel

**Access:** CUSTOMER, corresponding BUSINESS_OWNER, or ADMIN

Request:

```json
{
  "reason": "Schedule changed"
}
```

Rules:
- Customers may cancel confirmed bookings at least 12 hours before the start.
- Businesses may cancel confirmed bookings at least 6 hours before the start.
- Customers may withdraw their own pending bookings.
- Administrators may cancel problematic bookings with a mandatory reason.

Response: `200 OK`

Returns the updated booking.

## 6. Business Owner Endpoints

### POST /owner/business

**Access:** BUSINESS_OWNER

Registers one business for administrative approval.

Request:

```json
{
  "name": "Example Salon",
  "description": "Hair and beauty services",
  "timezone": "Europe/Moscow"
}
```

Response: `201 Created`

Initial approval status: `PENDING`.

### GET /owner/business

**Access:** BUSINESS_OWNER

Returns the authenticated owner's business and approval status.

### PATCH /owner/business

**Access:** BUSINESS_OWNER

Updates permitted business profile fields.

### POST /owner/services

**Access:** BUSINESS_OWNER with approved business

Request:

```json
{
  "name": "Haircut",
  "description": "Standard haircut",
  "price": "1500.00",
  "durationMinutes": 60,
  "capacity": 2
}
```

Response: `201 Created`

### GET /owner/services

**Access:** BUSINESS_OWNER

Returns services belonging to the owner's business.

### PATCH /owner/services/:serviceId

**Access:** Owning BUSINESS_OWNER

Updates service details.

Capacity reductions must not invalidate existing reservations.

### DELETE /owner/services/:serviceId

**Access:** Owning BUSINESS_OWNER

Deactivates the service without deleting its booking history.

### GET /owner/services/:serviceId/schedules

**Access:** Owning BUSINESS_OWNER

Returns recurring weekly schedules.

### PUT /owner/services/:serviceId/schedules

**Access:** Owning BUSINESS_OWNER

Replaces the service's weekly schedule.

Request:

```json
{
  "schedules": [
    {
      "weekday": 1,
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

`weekday` uses ISO numbering: Monday = 1, Sunday = 7.

### GET /owner/services/:serviceId/exceptions

**Access:** Owning BUSINESS_OWNER

Returns availability exceptions.

### POST /owner/services/:serviceId/exceptions

**Access:** Owning BUSINESS_OWNER

Creates an exceptional opening or closure.

Request:

```json
{
  "startAt": "2026-11-20T09:00:00Z",
  "endAt": "2026-11-20T12:00:00Z",
  "type": "CLOSED"
}
```

### DELETE /owner/exceptions/:exceptionId

**Access:** Owning BUSINESS_OWNER

Removes an availability exception.

### GET /owner/bookings

**Access:** BUSINESS_OWNER

Returns bookings for services belonging to the owner's business.

Optional filters:
- `status`
- `date`
- `serviceId`
- `page`
- `limit`

### POST /owner/bookings/:bookingId/approve

**Access:** Corresponding BUSINESS_OWNER

Transitions `PENDING` to `CONFIRMED`.

Approval is allowed only before the pending booking expires and before the appointment starts.

### POST /owner/bookings/:bookingId/reject

**Access:** Corresponding BUSINESS_OWNER

Transitions `PENDING` to `REJECTED`.

Request:

```json
{
  "reason": "Service unavailable"
}
```

### GET /owner/time-blocks

**Access:** BUSINESS_OWNER

Returns capacity blocks belonging to the owner's services.

### POST /owner/time-blocks

**Access:** Owning BUSINESS_OWNER

Creates an external booking or unavailability block.

Request:

```json
{
  "serviceId": "uuid",
  "startAt": "2026-11-20T09:00:00Z",
  "endAt": "2026-11-20T10:00:00Z",
  "units": 1,
  "reason": "EXTERNAL_BOOKING"
}
```

No external customer information is stored.

### DELETE /owner/time-blocks/:blockId

**Access:** Owning BUSINESS_OWNER

Removes a capacity block.

### GET /owner/statistics

**Access:** BUSINESS_OWNER

Returns basic statistics for the owner's business.

Response:

```json
{
  "data": {
    "totalBookings": 100,
    "pendingBookings": 8,
    "confirmedBookings": 60,
    "cancelledBookings": 12,
    "popularServices": [
      {
        "serviceId": "uuid",
        "name": "Haircut",
        "bookingCount": 45
      }
    ]
  }
}
```

Statistics may support optional date-range filters.

## 7. Administrator Endpoints

All endpoints in this section require the ADMIN role.

### GET /admin/businesses

Returns businesses, including pending registrations.

Optional filters:
- `approvalStatus`
- `page`
- `limit`

### POST /admin/businesses/:businessId/approve

Approves a business registration.

### POST /admin/businesses/:businessId/reject

Rejects a business registration.

Request:

```json
{
  "reason": "Incomplete business information"
}
```

### GET /admin/users

Returns user account information without password hashes.

### GET /admin/bookings

Returns platform bookings with search and filtering.

### POST /admin/bookings/:bookingId/cancel

Cancels a problematic booking.

Request:

```json
{
  "reason": "Duplicate reservation detected"
}
```

The action must be recorded in the administrative audit log.

### GET /admin/statistics

Returns platform-wide booking and business statistics.

### GET /admin/actions

Returns administrative audit records.

## 8. Booking Business Rules

The API must enforce the following rules:

1. Only authenticated customers can create booking requests.
2. Only approved businesses can receive new bookings.
3. Each service has independent capacity.
4. Booking duration comes from the selected service.
5. Pending bookings reserve capacity until expiration.
6. Confirmed bookings reserve capacity until completion or cancellation.
7. The business must approve or reject pending bookings within 24 hours or before the appointment starts, whichever occurs first.
8. Customers can cancel confirmed bookings at least 12 hours before the start.
9. Business owners can cancel confirmed bookings at least 6 hours before the start.
10. Administrators can cancel problematic bookings with an audit record.
11. External time blocks reduce capacity.
12. All capacity-changing operations must be concurrency-safe.
13. Users cannot access another user's private information without authorization.

## 9. Validation Rules

Input validation must include:

- Valid email addresses.
- Password requirements.
- Valid UUID identifiers.
- Allowed role and status values.
- Positive service duration.
- Positive service capacity.
- Non-negative service price.
- Valid ISO 8601 timestamps.
- Valid business time zones.
- Valid schedule intervals.
- Valid booking state transitions.
- Capacity availability.

Zod schemas should be shared or coordinated with the API implementation.

## 10. Error Codes

Suggested application error codes:

| Code | Meaning |
|---|---|
| VALIDATION_ERROR | Invalid request data |
| UNAUTHENTICATED | Login required |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource does not exist |
| EMAIL_ALREADY_EXISTS | Email is already registered |
| BUSINESS_NOT_APPROVED | Business is not approved |
| BUSINESS_ALREADY_EXISTS | Owner already registered a business |
| SERVICE_UNAVAILABLE | Service is not available |
| CAPACITY_EXCEEDED | Requested capacity is unavailable |
| BOOKING_EXPIRED | Pending booking has expired |
| INVALID_BOOKING_STATUS | Invalid state transition |
| CANCELLATION_DEADLINE_PASSED | Cancellation deadline has passed |
| CONFLICT | Resource state conflict |
| INTERNAL_ERROR | Unexpected server error |

## 11. API Documentation

The backend should expose API documentation generated from its implementation where practical.

Recommended:
- OpenAPI specification.
- Interactive API documentation.
- Example request and response payloads.

The implemented API must remain consistent with the reviewed contract.

## 12. Implementation and Review

This document is a proposed API contract, not a completed implementation.

Before frontend/backend integration, the team must confirm:

- Authentication and session strategy.
- Final endpoint paths.
- Request and response schemas.
- Pagination conventions.
- Booking status transitions.
- Availability calculation.
- Error response format.

Any incompatible API change must be communicated to frontend developers before merging.
