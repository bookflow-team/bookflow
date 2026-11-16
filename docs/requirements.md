
# BookFlow — Software Requirements Specification

## 1. Project Overview

BookFlow is a responsive web-based appointment booking platform connecting customers with service businesses.

Customers can discover businesses, request appointments, and manage their bookings. Business owners can manage services, schedules, reservations, and basic statistics. Administrators supervise the platform and resolve booking-related issues.

The project will be developed as a Minimum Viable Product (MVP) over four two-week sprints.

## 2. User Roles

### 2.1 Customer
- Register and log in.
- Browse businesses and available services.
- View service prices, durations, and availability.
- Request appointments.
- View upcoming and past bookings.
- Withdraw pending booking requests.
- Cancel confirmed bookings at least 12 hours before the appointment.

### 2.2 Business Owner
- Register one business per account.
- Wait for administrator approval before publishing services.
- Create, edit, and deactivate services.
- Configure service prices, durations, and capacity.
- Define working hours and availability exceptions.
- Approve or reject booking requests.
- View and manage reservations.
- Cancel confirmed bookings at least 6 hours before the appointment.
- Block capacity for external appointments.
- View basic booking statistics.

### 2.3 Administrator
- Approve or reject business registrations.
- View registered users and businesses.
- Search and inspect all reservations.
- Cancel problematic reservations with a mandatory reason.
- View platform-wide statistics.
- Access an audit history of administrative interventions.

## 3. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | User registration and authentication |
| FR-02 | Role-based authorization |
| FR-03 | Business registration and administrative approval |
| FR-04 | Business catalog and service browsing |
| FR-05 | Service creation, editing, and deactivation |
| FR-06 | Working hours and availability management |
| FR-07 | Independent capacity configuration per service |
| FR-08 | Available appointment time calculation |
| FR-09 | Booking request creation |
| FR-10 | Manual booking approval or rejection |
| FR-11 | Booking cancellation and pending request withdrawal |
| FR-12 | External appointment capacity blocking |
| FR-13 | Customer booking history |
| FR-14 | Business booking dashboard and statistics |
| FR-15 | Administrative reservation management |
| FR-16 | Administrative action auditing |
| FR-17 | Platform-wide statistics |

## 4. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Each account has one primary role: Customer, Business Owner, or Administrator. |
| BR-02 | Each business owner account can manage one business. |
| BR-03 | Business registrations require administrator approval. |
| BR-04 | Approved businesses can publish services without additional approval. |
| BR-05 | Each service has an independent, configurable capacity. |
| BR-06 | Appointment time slots are based on service duration. |
| BR-07 | Booking requests require manual business approval. |
| BR-08 | Pending bookings occupy capacity. |
| BR-09 | Businesses have up to 24 hours to approve or reject requests. |
| BR-10 | Pending requests expire after 24 hours or at the appointment start time, whichever occurs first. |
| BR-11 | Customers can cancel confirmed bookings at least 12 hours before the appointment. |
| BR-12 | Businesses can cancel confirmed bookings at least 6 hours before the appointment. |
| BR-13 | Customers can withdraw unresolved pending requests. |
| BR-14 | External reservations block capacity without storing external customer information. |
| BR-15 | Administrators can cancel problematic reservations with a mandatory recorded reason. |
| BR-16 | Capacity must be checked across the entire appointment duration. |
| BR-17 | The backend must prevent overbooking, including simultaneous requests. |
| BR-18 | Appointment times must respect the business's configured time zone. |

## 5. Booking Statuses

- `PENDING`: Awaiting business approval.
- `CONFIRMED`: Approved by the business.
- `REJECTED`: Rejected by the business.
- `CANCELLED`: Cancelled by an authorized actor.
- `EXPIRED`: Approval deadline reached.
- `COMPLETED`: Appointment completed.

Rejected, cancelled, and expired bookings release their reserved capacity.

## 6. Required Web Pages

### Public
- Home
- Business Catalog
- Business Details
- Login
- Register

### Customer
- Booking
- My Appointments

### Business Owner
- Business Dashboard
- Services Management
- Availability Management
- Reservations Management

### Administrator
- Admin Dashboard
- Users & Businesses
- Reservations Oversight

## 7. Non-Functional Requirements

- Responsive interface for desktop and mobile browsers.
- Secure password hashing and authentication.
- Backend validation of user input.
- Role-based access control on protected operations.
- Safe handling of concurrent booking requests.
- Consistent database transactions.
- Environment-based configuration.
- Automated checks using GitHub Actions.
- Reproducible local deployment with Docker Compose.
- Clear API documentation and maintainable code.

## 8. MVP Scope Exclusions

The MVP does not include:
- Online payments.
- Native mobile applications.
- Email, SMS, or push notifications.
- Employee-specific schedules.
- Shared capacity across different services.
- Multiple businesses per owner account.
- Customer reviews.
- Advanced financial analytics.
- External customer records.
- Third-party calendar integration.
- Mandatory public hosting.

## 9. Acceptance Criteria

The MVP is complete when:

1. Customers can register, log in, request appointments, and manage their bookings.
2. Administrators can approve business registrations.
3. Approved businesses can publish services and configure availability.
4. Businesses can approve, reject, and cancel reservations.
5. External blocks correctly reduce service capacity.
6. The backend prevents overlapping reservations from exceeding capacity.
7. Administrators can investigate and resolve problematic reservations.
8. Basic business and platform statistics are available.
9. Protected operations enforce ownership and role permissions.
10. Frontend, backend, and PostgreSQL run together through Docker Compose.
11. GitHub Actions executes automated checks.
12. The team can demonstrate the complete booking workflow.

