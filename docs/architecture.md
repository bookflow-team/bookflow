
# BookFlow — System Architecture

## 1. Overview

BookFlow is a responsive web-based appointment booking platform.

The system follows a client-server architecture consisting of three main components:

- Frontend: React web application.
- Backend: REST API built with ElysiaJS.
- Database: PostgreSQL.

The application will run locally using Docker Compose. GitHub Actions will provide continuous integration.

## 2. Technology Stack

### 2.1 Frontend

- **React** — User interface library.
- **TypeScript** — Statically typed programming language.
- **Vite** — Development server and build tool.
- **Tailwind CSS** — Utility-first CSS framework for styling.
- **React Router** — Client-side routing and navigation.
- **Fetch API** — HTTP communication with the backend.

### 2.2 Backend

- **Bun** — JavaScript/TypeScript runtime and package manager.
- **ElysiaJS** — HTTP framework for building the REST API.
- **Zod** — Schema validation and data parsing.
- **Drizzle ORM** — Type-safe database access and migrations.
- **PostgreSQL** — Relational database management system.

### 2.3 Infrastructure and Collaboration

- **Docker** — Application containerization.
- **Docker Compose** — Multi-container orchestration for local development.
- **GitHub Actions** — Continuous integration and automated checks.
- **GitHub Projects** — Task tracking and sprint management.
- **Git** — Version control system.
- **GitHub** — Source code hosting and team collaboration.

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

The project follows a modular structure, separating frontend, backend, infrastructure, and technical documentation.

The frontend is organized by application area and user role rather than by developer. This makes the codebase easier to navigate, maintain, review, and extend.

### 7.1 Repository Structure

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
│   ├── pages/
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

### 7.2 Frontend Structure

```text
frontend/
├── src/
│   ├── pages/
│   │   ├── public/
│   │   ├── auth/
│   │   ├── customer/
│   │   ├── business/
│   │   └── admin/
│   ├── components/
│   ├── services/
│   │   ├── public/
│   │   ├── auth/
│   │   ├── customer/
│   │   ├── business/
│   │   └── admin/
│   ├── hooks/
│   ├── contexts/
│   ├── routes/
│   ├── types/
│   ├── lib/
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── Dockerfile
```

### 7.3 Frontend Directory Responsibilities

| Directory | Responsibility |
|---|---|
| `pages/public/` | Home page, business catalog, business details |
| `pages/auth/` | Login and registration |
| `pages/customer/` | Customer booking and appointment management |
| `pages/business/` | Business dashboard, services, schedules, reservations |
| `pages/admin/` | Administrative dashboard and oversight |
| `components/` | Reusable UI components |
| `services/` | API communication, grouped by application area |
| `hooks/` | Reusable React hooks |
| `contexts/` | Shared application state and authentication context |
| `routes/` | Route configuration and role-based route guards |
| `types/` | Shared TypeScript types |
| `lib/` | General utilities and helpers |

### 7.4 Organization Rules

- Frontend pages must be grouped by application area and user role.
- Each frontend developer implements and integrates their assigned features.
- Files must not be organized into developer-specific directories.
- Shared components must be reusable and should not duplicate existing functionality.
- API communication should be separated from page presentation logic.
- Protected routes must enforce appropriate frontend navigation restrictions.
- Backend authorization remains mandatory for every protected operation.
- Frontend developers must coordinate changes to shared components, routing, and authentication utilities.

This structure represents the intended architecture. Directories and files will be created progressively during development.


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

