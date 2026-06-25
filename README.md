# Nine to Shine

A full-stack private group management app for organizing games, rankings, duties, and finances in one authenticated workspace.

Nine to Shine combines a modern Next.js frontend with an ASP.NET Core Web API and PostgreSQL backend. The app is designed for a close group that needs a reliable place to track seasons, game results, organizer responsibilities, shared expenses, deposits, and balances.

## Key Features

- **Authenticated dashboard** with Firebase-backed sign-in and protected app routes.
- **Season and game management** for creating, organizing, and reviewing group activities.
- **Ranking system** for tracking players, points, attendance, and season leaders.
- **Organizer duty rotation** with automatic duty generation, skipped-duty handling, and next-organizer visibility.
- **Finance tracking** for income, expenses, user balances, club balance, trips, and game-related bookings.
- **Admin center** for managing users, seasons, games, and organizer workflows.
- **Responsive UI** built with Material UI and optimized for everyday use.
- **API-first architecture** with typed frontend DTOs aligned to backend request and response contracts.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 18, TypeScript |
| UI | Material UI, notistack |
| Forms and validation | react-hook-form, Zod |
| API client | Axios with Firebase token injection |
| Backend | ASP.NET Core Web API, .NET 8 |
| Database | PostgreSQL, Entity Framework Core |
| Authentication | Firebase JWT validation |
| Logging and docs | Serilog, Swagger/OpenAPI |
| Testing | xUnit, Testcontainers, Vitest, Testing Library |


## Getting Started

### Prerequisites

Install the following before running the project locally:

- Node.js and npm
- .NET 8 SDK
- PostgreSQL
- Firebase project configuration

### Backend Setup

```bash
cd nine_to_shine_backend
dotnet restore
```

Create a local backend settings file from the example:

```bash
cp appsettings.example.json appsettings.Development.json
```

Update the local settings with your PostgreSQL connection string and Firebase project ID.

Build and run the API:

```bash
dotnet build
dotnet run
```

The backend listens on:

```text
http://localhost:5006
```

In `Development` and `DevOnline`, Swagger is available at:

```text
http://localhost:5006/swagger
```

### Frontend Setup

```bash
cd nine_to_shine_frontend
npm install
```

Create a local frontend environment file from the example:

```bash
cp .env.example .env.local
```

Set the API base URL and Firebase client configuration:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:5006/api
```

Start the development server:

```bash
npm run dev
```

The frontend runs on:

```text
http://localhost:3000
```

### Security Note

Do not commit real `.env` files, production settings, database passwords, Firebase credentials, bearer tokens, or generated logs. Keep local configuration files private and use the provided example files as templates only.

## Usage Examples

Start the backend:

```bash
cd nine_to_shine_backend
dotnet run
```

Start the frontend in another terminal:

```bash
cd nine_to_shine_frontend
npm run dev
```

Check API health:

```bash
curl http://localhost:5006/api/health
```

Open Swagger in a browser during development:

```text
http://localhost:5006/swagger
```

Run backend verification:

```bash
cd nine_to_shine_backend
dotnet build
dotnet test
```

Run frontend verification:

```bash
cd nine_to_shine_frontend
npm run lint
npm run build
npm test
```

## Project Structure

```text
nine_to_shine/
├── nine_to_shine_backend/
│   ├── Controllers/              # ASP.NET Core API controllers
│   ├── Data/                     # EF Core DbContext and database mapping
│   ├── Middleware/               # Request logging middleware
│   ├── Migrations/               # EF Core migrations
│   ├── Models/                   # Entity models
│   ├── NineToShineApi.Tests/     # Backend integration and API tests
│   ├── Program.cs                # App startup, auth, CORS, Swagger, health checks
│   └── appsettings.example.json  # Backend configuration template
├── nine_to_shine_frontend/
│   ├── public/                   # Static assets and app icons
│   ├── src/
│   │   ├── app/                  # Next.js app router pages
│   │   ├── common/               # Shared routes, helpers, and utilities
│   │   ├── components/           # Reusable UI components
│   │   ├── definitions/          # API client, commands, and DTO types
│   │   ├── hooks/                # Shared React hooks
│   │   └── schema/               # Zod validation schemas
│   ├── .env.example              # Frontend configuration template
│   └── package.json              # Frontend scripts and dependencies
├── AGENTS.md                     # Repository guidance for AI coding agents
├── LICENSE
└── README.md
```

## Testing and Verification

Backend:

```bash
cd nine_to_shine_backend
dotnet build
dotnet test
```

Frontend:

```bash
cd nine_to_shine_frontend
npm run lint
npm run build
npm test
```

For UI changes, run the frontend locally and smoke-test the affected workflow in a browser. For backend changes that touch data access, verify migrations and test the affected endpoints with valid Firebase authentication where practical.

## License

This project is licensed under the terms of the repository [LICENSE](./LICENSE).
