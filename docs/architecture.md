
# BookFlow — System Architecture

## 1. Overview

BookFlow is a responsive web-based appointment booking platform.

The system follows a client-server architecture consisting of three main components:

- Frontend: React web application.
- Backend: REST API built with ElysiaJS.
- Database: PostgreSQL.

The application will run locally using Docker Compose. GitHub Actions will provide continuous integration.

## 2. Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Fetch API

### Backend
- Bun (runtime and package manager)
- ElysiaJS (HTTP framework)
- Zod (data validation)
- Drizzle ORM (database access and migrations)
- PostgreSQL (relational database)

### Infrastructure
- Docker
- Docker Compose
- GitHub Actions
- GitHub Projects
- Git and GitHub

## 3. System Components

### 3.1 Frontend

The frontend provides the user interface for customers, business owners, and administrators.

Responsibilities:
- Display businesses and services.
- Handle registration and login forms.
- Display available appointment slots.
- Allow customers to request and manage bookings.
- Provide business management dashboards.
- Provide administrative interfaces.
- Communicate with the backend through REST endpoints.

The frontend must not access PostgreSQL directly.

### 3.2 Backend

The backend is responsible for application logic and security.

Responsibilities:
- Authentication and authorization.
- Business registration and approval.
- Service and availability management.
- Booking creation and approval.
- Booking cancellation rules.
- Capacity management.
- External capacity blocks.
- Administrative operations and audit logging.
- Data validation and database transactions.

All protected operations must verify user permissions on the server.

### 3.3 Database

PostgreSQL stores persistent application data.

Main entities:
- User
- Business
- Service
- Availability
- Booking
- TimeBlock
- AdminAction

The final database schema may separate recurring schedules and availability exceptions into different tables.

Database access will be implemented using Drizzle ORM.

## 4. Communication Architecture

The frontend communicates with the backend through HTTP requests using JSON.

Example:

1. A customer selects a service and appointment time.
2. React sends a booking request to the REST API.
3. ElysiaJS validates the request and user permissions.
4. The backend checks service availability and capacity.
5. PostgreSQL stores the booking transactionally.
6. The backend returns the booking result.
7. React updates the interface.

The API contract will define endpoint paths, request bodies, response formats, and error codes.

## 5. Authentication and Authorization

The application supports three primary roles:

- CUSTOMER
- BUSINESS_OWNER
- ADMIN

Each account has one primary role.

Business owners must receive administrative approval before publishing services.

Authentication must use securely hashed passwords and a server-managed session or another explicitly agreed authentication mechanism.

Authorization is enforced by backend middleware and endpoint-level ownership checks.

## 6. Booking Architecture

Each service has:
- A configurable duration.
- An independent capacity.
- Defined working hours.
- Optional availability exceptions.

Appointment slots are calculated according to service duration.

Booking states:
- PENDING
- CONFIRMED
- REJECTED
- CANCELLED
- EXPIRED
- COMPLETED

Pending and confirmed bookings occupy capacity.

The business must approve or reject a booking within 24 hours, and no later than the appointment start time.

Customers can cancel confirmed bookings at least 12 hours before the appointment.

Businesses can cancel confirmed bookings at least 6 hours before the appointment.

Pending requests may be withdrawn by the customer.

External reservations are represented by capacity blocks without storing external customer records.

Capacity validation and booking creation must be concurrency-safe.

## 7. Project Structure

```text
bookflow/
├── .github/
│   └── workflows/
├── backend/
│   ├── src/
│   ├── drizzle/
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── types/
│   ├── package.json
│   └── Dockerfile
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── database-design.md
│   ├── api-contract.md
│   ├── development-workflow.md
│   └── uml/
├── compose.yaml
├── .env.example
├── .gitignore
└── README.md
```

This is the target structure. Some files and directories will be created during development.

## 8. Docker Compose

Docker Compose will manage:
- Frontend service.
- Backend service.
- PostgreSQL database.

Environment variables will configure database credentials, API URLs, and authentication secrets.

Sensitive credentials must not be committed to Git.

The `.env.example` file will document required environment variables without containing real secrets.

## 9. Continuous Integration

GitHub Actions will run automated checks for pull requests and changes to `main`.

Initial CI checks:
- Install dependencies.
- Run TypeScript checks.
- Run linting where configured.
- Run available automated tests.
- Build the frontend.
- Validate the backend.

Required checks will be enabled in branch protection only after the corresponding workflows are implemented and verified.

Automatic public deployment is not required for the MVP.

## 10. Development Workflow

- Each task is tracked using a GitHub Issue.
- Developers work in separate feature branches.
- Changes are submitted through Pull Requests.
- At least one approving review is required before merging into `main`.
- Important architectural changes are reviewed by the team.
- Pull Requests should remain small and focused.
- Approximately 700 changed lines per code delivery is a guideline, not a strict repository limit.
- Documentation and generated files may be treated separately.

## 11. Design Principles

- Keep the implementation simple and maintainable.
- Reuse frontend components.
- Keep business logic in the backend.
- Validate all client input.
- Enforce role-based access control.
- Prevent overbooking through database-safe operations.
- Separate configuration from source code.
- Document API changes before frontend integration.
- Prefer a working MVP over unnecessary features.

## 12. MVP Deployment

The final project must be reproducible locally using Docker Compose.

A successful demonstration should include:
1. Starting all services.
2. Registering a customer.
3. Registering and approving a business.
4. Publishing a service.
5. Requesting and approving an appointment.
6. Cancelling a reservation according to the rules.
7. Blocking capacity for an external appointment.
8. Viewing business statistics.
9. Performing an administrative intervention.

