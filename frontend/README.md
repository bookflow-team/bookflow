# BookFlow Frontend

Frontend application for the BookFlow project, built with React, TypeScript, Vite, and Tailwind CSS.

## Technologies

- React
- TypeScript
- Vite
- Tailwind CSS
- ESLint

## Requirements

- Node.js compatible with Vite
- npm

## Installation

1. Clone the repository.
2. Open a terminal in the `frontend` directory.
3. Install dependencies:

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server |
| `npm run build` | Builds the application for production |
| `npm run typecheck` | Checks TypeScript types |
| `npm run lint` | Runs ESLint |
| `npm run preview` | Previews the production build |

## Project Structure

```text
src/
├── assets/       # Images and static resources
├── components/   # Reusable React components
├── hooks/        # Custom React hooks
├── pages/        # Application pages
├── services/     # Backend API communication
├── types/        # TypeScript types and interfaces
├── App.tsx       # Main application component
├── index.css     # Global styles and Tailwind CSS
└── main.tsx      # Application entry point
```

## Production Build

Run:

```bash
npm run typecheck
npm run build
```

The production files will be generated in the `dist/` directory.


## Frontend Routing

BookFlow uses React Router for client-side navigation.

### Available Routes

| Path | Page | Description |
|---|---|---|
| `/` | HomePage | Public homepage |
| `/catalog` | CatalogPage | Service catalog placeholder |
| `/business/:id` | BusinessDetailsPage | Business details placeholder |
| `/login` | LoginPage | Login placeholder |
| `/register` | RegisterPage | Registration placeholder |
| `*` | NotFoundPage | Fallback for unknown routes |

### Page Organization

Pages are organized by user role:

- `src/pages/public/` - Publicly accessible pages.
- `src/pages/auth/` - Login and registration pages.
- `src/pages/customer/` - Customer-specific pages.
- `src/pages/business/` - Business management pages.
- `src/pages/admin/` - Administration pages.

### Shared Components

Shared components are located in `src/components/`.

- `layout/Navbar.tsx` - Responsive navigation.
- `layout/MainLayout.tsx` - Shared layout containing the navbar and page content.

### Routing Conventions

1. Define shared routes in `src/routes/AppRouter.tsx`.
2. Use `NavLink` or `Link` for internal navigation.
3. Use `Outlet` to render nested routes inside layouts.
4. Keep page components inside their corresponding role directories.
5. Use PascalCase for React component filenames.
6. Keep shared components reusable.
7. Coordinate changes to shared routing with the team.

### Collaboration Notes

Nikita and Ian should follow these conventions when
implementing new frontend features.

Current pages are placeholders. Authentication, booking,
and business functionality will be implemented in
their corresponding Issues.
