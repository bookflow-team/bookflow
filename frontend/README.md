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

Open `http://localhost:5173/` in your browser.

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
