# Change Request (CR) System - Backend API

Backend API untuk Sistem Pengajuan Change Request dengan alur approval berjenjang.

## Technology Stack

- **Runtime**: Node.js 24 LTS
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **File Upload**: Multer
- **PDF Generation**: PDFKit
- **Real-time**: Socket.IO
- **API Documentation**: Swagger (OpenAPI 3.0)
- **Containerization (Optional)**: Docker

## Project Structure

```
server/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── prisma.config.ts    # Prisma 7 configuration
│   ├── migrations/         # Migration history
│   └── seed.js             # Seed data
├── src/
│   ├── config/             # Configuration files
│   │   ├── index.js        # Environment config
│   │   ├── prisma.js       # Prisma client instance
│   │   └── swagger.js      # Swagger/OpenAPI config
│   ├── controllers/        # Request handlers
│   │   ├── authController.js
│   │   ├── ticketController.js
│   │   ├── approvalController.js
│   │   ├── notificationController.js
│   │   └── dashboardController.js
│   ├── middlewares/        # Express middlewares
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── uploadMiddleware.js
│   │   ├── validationMiddleware.js
│   │   └── errorMiddleware.js
│   ├── routes/             # API routes
│   │   ├── authRoutes.js
│   │   ├── ticketRoutes.js
│   │   ├── approvalRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── index.js
│   ├── services/           # Business logic
│   │   ├── authService.js
│   │   ├── ticketService.js
│   │   ├── approvalService.js
│   │   ├── notificationService.js
│   │   ├── dashboardService.js
│   │   └── pdfService.js
│   ├── utils/              # Helper functions
│   │   ├── apiError.js
│   │   ├── apiResponse.js
│   │   ├── dateHelper.js
│   │   ├── fileHelper.js
│   │   ├── idGenerator.js
│   │   └── index.js
│   ├── validations/        # Zod schemas
│   │   ├── authValidation.js
│   │   ├── ticketValidation.js
│   │   ├── approvalValidation.js
│   │   └── index.js
│   └── app.js              # Entry point
├── uploads/                # Uploaded files
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Production compose
├── docker-compose.dev.yml  # Development compose
├── docker.sh               # Docker helper (Linux/Mac)
├── docker.bat              # Docker helper (Windows)
├── .env.example            # Environment template
├── .env.docker             # Docker environment template
├── DEPLOYMENT.md           # Deployment guide
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Update the configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cr_system?schema=public"

# JWT (IMPORTANT: Change in production!)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development

# Upload
MAX_FILE_SIZE=10485760
MAX_FILES=5
UPLOAD_PATH="./uploads"
```

### 3. Setup Database

Generate Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

Or push schema directly (for development):

```bash
npm run prisma:push
```

### 4. Seed Database (Optional)

```bash
npm run seed
```

This creates sample users for testing:

| Role       | Email                      | Password     |
|------------|----------------------------|--------------|
| USER       | user1@company.com          | password123  |
| MANAGER    | manager.unita@company.com  | password123  |
| VP         | vp.it@company.com          | password123  |
| MANAGER_IT | manager.it@company.com     | password123  |
| DEV        | dev1@company.com           | password123  |

### 5. Run Server

Development (with hot reload):

```bash
npm run dev
```

Production:

```bash
npm start
```

Server will start at:
- **API**: http://localhost:3000/api
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/health

## Docker Setup

### Quick Start with Docker

```bash
# Development (with hot reload)
npm run docker:dev:build

# Production
npm run docker:prod:build
```

### Docker Commands

| Command | Description |
|---------|-------------|
| `npm run docker:dev` | Start development container |
| `npm run docker:dev:build` | Build & start development |
| `npm run docker:dev:down` | Stop development container |
| `npm run docker:prod` | Start production container |
| `npm run docker:prod:build` | Build & start production |
| `npm run docker:prod:down` | Stop production container |
| `npm run docker:logs` | View container logs |
| `npm run docker:clean` | Remove all containers & images |

### Using Helper Scripts

**Windows:**
```powershell
.\docker.bat dev:build
.\docker.bat logs
.\docker.bat migrate
```

**Linux/Mac:**
```bash
./docker.sh dev:build
./docker.sh logs
./docker.sh migrate
```

> **Note:** Docker setup connects to external PostgreSQL. Configure `DATABASE_URL` in `.env.docker`.

## API Documentation (Swagger)

Interactive API documentation is available at:

```
http://localhost:3000/api-docs
```

Features:
- 📋 Complete endpoint documentation
- 🔐 JWT authentication testing (Authorize button)
- 📝 Request/Response examples
- 📦 Schema definitions

JSON spec available at:
```
http://localhost:3000/api-docs.json
```

## API Endpoints

### Authentication

| Method | Endpoint           | Description          | Auth |
|--------|-------------------|----------------------|------|
| POST   | /api/auth/register| Register new user    | No   |
| POST   | /api/auth/login   | Login                | No   |
| GET    | /api/auth/me      | Get current user     | Yes  |
| PUT    | /api/auth/me      | Update profile       | Yes  |
| PUT    | /api/auth/password| Change password      | Yes  |
| GET    | /api/auth/users   | Get users by role    | Yes  |

### Tickets (Change Requests)

| Method | Endpoint                      | Description            | Role     |
|--------|------------------------------|------------------------|----------|
| GET    | /api/tickets                 | List CRs (filtered)    | All      |
| POST   | /api/tickets                 | Create new CR          | USER     |
| GET    | /api/tickets/:id             | Get CR details         | All      |
| PUT    | /api/tickets/:id             | Update CR              | USER     |
| DELETE | /api/tickets/:id             | Delete CR (soft)       | USER     |
| POST   | /api/tickets/:id/submit      | Submit for approval    | USER     |
| POST   | /api/tickets/:id/resubmit    | Resubmit after revision| USER     |
| GET    | /api/tickets/:id/progress    | Get progress tracking  | All      |
| GET    | /api/tickets/:id/pdf         | Download PDF           | All      |
| POST   | /api/tickets/:id/documents   | Upload document        | USER     |
| DELETE | /api/tickets/:id/documents/:docId | Delete document   | USER     |

### Approval Workflow

| Method | Endpoint                           | Description              | Role       |
|--------|-----------------------------------|--------------------------|------------|
| POST   | /api/approval/:id/manager/approve  | Manager approve          | MANAGER    |
| POST   | /api/approval/:id/manager/reject   | Manager reject (final)   | MANAGER    |
| POST   | /api/approval/:id/manager/revision | Manager request revision | MANAGER    |
| POST   | /api/approval/:id/vp/approve       | VP approve               | VP         |
| POST   | /api/approval/:id/vp/reject        | VP reject (final)        | VP         |
| POST   | /api/approval/:id/vp/revision      | VP request revision      | VP         |
| POST   | /api/approval/:id/assign           | Assign to developer      | MANAGER_IT |
| POST   | /api/approval/:id/complete         | Mark as completed        | MANAGER_IT, DEV |

### Notifications

| Method | Endpoint                        | Description              |
|--------|--------------------------------|--------------------------|
| GET    | /api/notifications             | Get notifications        |
| GET    | /api/notifications/unread-count| Get unread count         |
| PUT    | /api/notifications/:id/read    | Mark as read             |
| PUT    | /api/notifications/read-all    | Mark all as read         |

### Dashboard

| Method | Endpoint        | Description                    |
|--------|----------------|--------------------------------|
| GET    | /api/dashboard | Get dashboard (role-based)     |

### Health Check

| Method | Endpoint        | Description                    |
|--------|----------------|--------------------------------|
| GET    | /api/health    | API health status              |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with hot reload |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations (dev) |
| `npm run prisma:migrate:deploy` | Run migrations (production) |
| `npm run prisma:push` | Push schema to database |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed` | Seed database with test data |

## Approval Flow

```
                    ┌─────────────┐
                    │    DRAFT    │
                    └──────┬──────┘
                           │ submit
                           ▼
                ┌───────────────────┐
         ┌──────│  PENDING_MANAGER  │──────┐
         │      └───────────────────┘      │
         │ reject (final)                  │ approve
         ▼                                 ▼
┌────────────────┐              ┌─────────────────┐
│REJECTED_MANAGER│              │   PENDING_VP    │
└────────────────┘              └────────┬────────┘
         │ revision                      │
         ▼                     ┌─────────┼─────────┐
┌─────────────────┐            │         │         │
│REVISION_MANAGER │            │ reject  │ approve │ revision
└────────┬────────┘            ▼         ▼         ▼
         │ resubmit    ┌───────────┐ ┌────────┐ ┌──────────┐
         └─────────────│REJECTED_VP│ │APPROVED│ │REVISION_VP│
                       └───────────┘ └───┬────┘ └────┬─────┘
                                         │           │
                                         │ assign    │ resubmit
                                         ▼           │
                                   ┌──────────────┐  │
                                   │ ASSIGNED_DEV │  │
                                   └──────┬───────┘  │
                                          │          │
                                          │ complete │
                                          ▼          │
                                   ┌──────────────┐  │
                                   │  COMPLETED   │  │
                                   └──────────────┘  │
                                                     │
                              (back to PENDING_MANAGER)
```

## Real-time Notifications

The server uses Socket.IO for real-time notifications. Frontend should:

1. Connect to the WebSocket server
2. Emit `join` event with userId after authentication
3. Listen for `notification` events

```javascript
const socket = io('http://localhost:3000');

// After login
socket.emit('join', userId);

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```

## Role Permissions

| Role       | Can Do                                              |
|------------|-----------------------------------------------------|
| USER       | Create, edit, delete (draft), submit CRs            |
| MANAGER    | Approve/reject/revision for unit CRs                |
| VP         | Approve/reject/revision all manager-approved CRs    |
| MANAGER_IT | Assign developers to approved CRs                   |
| DEV        | View assigned CRs, download doc, mark as completed  |

## Deployment

For production deployment on Ubuntu 24 LTS, see [DEPLOYMENT.md](./DEPLOYMENT.md).

Quick overview:
1. Install Node.js 20 LTS
2. Setup PostgreSQL
3. Configure environment variables
4. Run Prisma migrations
5. Use PM2 for process management
6. Setup Nginx as reverse proxy
7. Configure SSL with Let's Encrypt

## Security Notes

- ⚠️ Always change `JWT_SECRET` in production (min 32 characters)
- ⚠️ Use strong database passwords
- ⚠️ Enable HTTPS in production
- ⚠️ Don't expose database port to public
- ⚠️ Keep dependencies updated

## License

ISC
