# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

KMRL Train Scheduler is a comprehensive web application for the Kochi Metro Rail Limited (KMRL) train scheduling system. It's a full-stack TypeScript application with a React frontend, Node.js/Express backend, and PostgreSQL database, designed for real-time schedule management, seat booking, and route planning.

## Architecture

### System Architecture
- **Frontend**: React 18 + TypeScript with Material-UI (MUI) components
- **Backend**: Node.js/Express API with TypeScript  
- **Database**: PostgreSQL 14+ with Redis caching
- **State Management**: Redux Toolkit for frontend state
- **API Communication**: React Query for data fetching
- **Real-time Updates**: Socket.io for live schedule updates
- **Authentication**: JWT with refresh tokens
- **Containerization**: Docker with docker-compose for development

### Key Design Patterns
- **API Structure**: RESTful API with versioned endpoints (`/api/v1/`)
- **Database**: Entity relationship model with proper foreign keys and indexes
- **Frontend**: Component-based architecture with page-level routing
- **State Management**: Centralized Redux store with normalized data
- **Error Handling**: Global error middleware on backend, toast notifications on frontend
- **Multi-language Support**: i18next for English, Malayalam, and Hindi

### Project Structure
```
kmrl-train-scheduler/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── config/          # Configuration files
│   │   └── utils/           # Utility functions
│   ├── tests/               # Backend tests
│   └── package.json
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   └── services/        # API services
│   └── package.json
├── database/                # Database files
│   ├── migrations/          # Database migrations (if using migrations)
│   ├── seeds/               # Seed data
│   └── schema.sql           # Database schema
├── docs/                    # Documentation
└── docker-compose.yml       # Development environment
```

## Common Development Commands

### Environment Setup
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services with Docker
docker-compose up

# Start individual services (alternative)
# Backend
cd backend && npm install && npm run dev

# Frontend  
cd frontend && npm install && npm start
```

### Database Operations
```bash
# Database setup and migrations
cd backend
npm run migrate:latest
npm run seed:run

# Reset database completely
npm run db:reset

# Rollback migrations
npm run migrate:rollback
```

### Development Workflow
```bash
# Backend development
cd backend
npm run dev          # Start development server with nodemon
npm run build        # Build TypeScript to JavaScript
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint on TypeScript files
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier

# Frontend development  
cd frontend
npm start            # Start development server (port 3000)
npm run dev          # Alternative start command
npm run build        # Build for production
npm run test         # Run Jest tests
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint on TypeScript/React files
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
npm run analyze      # Analyze bundle size with webpack-bundle-analyzer
npm run cypress:open # Open Cypress for E2E testing
npm run cypress:run  # Run Cypress tests headlessly
```

### Testing
```bash
# Backend testing
cd backend
npm run test         # Run all backend tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Frontend testing
cd frontend
npm run test         # Run React tests (interactive mode)
npm run test:coverage # Run tests with coverage
npm run cypress:open # Open Cypress for E2E tests
npm run cypress:run  # Run E2E tests headlessly

# Run specific tests
cd backend && npm test -- AuthController.test.ts  # Specific test file
cd frontend && npm test -- HomePage.test.tsx      # Specific component test
```

### Docker Operations
```bash
# Development environment
docker-compose up
docker-compose up -d  # Detached mode

# Production build
docker-compose -f docker-compose.prod.yml up --build

# Individual services
docker-compose up postgres redis  # Only database services
```

## Code Architecture Details

### Backend Structure (`backend/src/`)
- **`index.ts`**: Main application entry point with middleware setup
- **`routes/`**: API route handlers (auth, users, stations, trains, schedules, bookings, notifications)
- **`controllers/`**: Business logic controllers for each entity
- **`middleware/`**: Custom middleware (auth, validation, error handling)
- **`config/`**: Database configuration and connection setup
- **`utils/`**: Utility functions (logger, helpers)

### Frontend Structure (`frontend/src/`)
- **`App.tsx`**: Main application component with routing setup
- **`pages/`**: Page-level components (HomePage, SchedulePage, BookingPage, etc.)
- **`components/`**: Reusable UI components
- **`store/`**: Redux store configuration and slices
- **`services/`**: API service functions for backend communication

### Database Schema (`database/schema.sql`)
Core entities with relationships:
- **Users**: Authentication and profile management
- **Stations**: Metro stations with multilingual names and geolocation
- **Trains**: Train fleet with capacity and facilities
- **Routes**: Train routes connecting stations
- **Schedules**: Timetable entries with frequency and pricing
- **Bookings**: Reservation system with QR codes and payment tracking
- **Notifications**: User notification system

### API Endpoints
All endpoints are prefixed with `/api/v1/`:
- `/auth` - Authentication (login, register, refresh)
- `/users` - User management and profiles
- `/stations` - Station information and search
- `/trains` - Train data and availability
- `/routes` - Route planning and information
- `/schedules` - Timetable queries and real-time updates
- `/bookings` - Reservation management
- `/notifications` - User notifications

## Development Guidelines

### Port Configuration
- **Frontend**: http://localhost:3000 (React development server)
- **Backend**: http://localhost:3001 (Express API server)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **API Documentation**: http://localhost:3001/api/v1/docs (Swagger)

### Running Single Tests
```bash
# Backend - specific test file
cd backend && npm test -- AuthController.test.ts

# Backend - specific test pattern
cd backend && npm test -- --testNamePattern="login"

# Frontend - specific test file
cd frontend && npm test -- HomePage.test.tsx

# Frontend - specific component tests
cd frontend && npm test -- --testPathPattern="components"
```

### Important Development Notes
- **No root package.json**: This project doesn't have root-level npm scripts; always run commands from `backend/` or `frontend/` directories
- **Database Initialization**: The database schema is automatically loaded via Docker volume mount to `/docker-entrypoint-initdb.d/`
- **Environment Files**: Copy `.env.example` files before starting development
- **Windows Development**: When using PowerShell, use `;` instead of `&&` for chaining commands (e.g., `cd backend; npm run dev`)
- **Node.js Version**: Requires Node.js 18+ and npm 9+ (check with `node --version` and `npm --version`)

### Database Development
- Use Knex.js migrations for schema changes
- Always create corresponding rollback migrations
- Seed data is available for development testing
- Database includes proper indexes and foreign key constraints
- Use PostgreSQL extensions (uuid-ossp, pgcrypto) for enhanced functionality

### API Documentation
- **Swagger/OpenAPI**: http://localhost:3001/api/v1/docs (when backend is running)
- **Base URL**: http://localhost:3001/api/v1/
- **WebSocket**: Socket.io server runs on same port (3001) for real-time features
- **Authentication**: JWT tokens with refresh token mechanism
- **Validation**: Joi schemas for request validation
- **Error Format**: Consistent JSON error responses with proper HTTP status codes

### Frontend Development
- Material-UI (MUI) components for consistent design
- Redux Toolkit for state management with typed actions
- React Query for server state management and caching
- i18next for internationalization (English, Malayalam, Hindi)
- Service Workers for PWA functionality and offline access

### Real-time Features
- Socket.io integration for live schedule updates
- Real-time notifications for booking status changes
- Live train tracking and delay notifications

### Security Implementation
- JWT authentication with refresh token rotation
- Input validation on all API endpoints
- SQL injection prevention through parameterized queries
- CORS configuration for secure cross-origin requests
- Helmet.js for security headers
- Rate limiting with express-rate-limit

## Troubleshooting

### Common Issues

**Docker containers not starting:**
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Rebuild containers
docker-compose down
docker-compose up --build
```

**Database connection issues:**
```bash
# Verify database is running
docker-compose ps postgres

# Check database connection from backend container
docker-compose exec backend npm run migrate:latest
```

**Port conflicts:**
- Backend (3001), Frontend (3000), PostgreSQL (5432), Redis (6379)
- Stop conflicting services or update docker-compose.yml ports

**Frontend proxy errors:**
- Ensure backend is running on port 3001
- Check `proxy` setting in frontend/package.json

### Quick Reset
```bash
# Complete environment reset
docker-compose down -v  # Remove volumes
docker-compose up --build
```
- CORS configured for frontend domain
- Helmet.js for security headers
- Rate limiting on API endpoints

### Multi-tenancy Support
The system is designed for KMRL but includes:
- Configurable system settings in database
- Multi-language support with database-stored translations
- Flexible route and schedule configuration
- Role-based access control (user, admin, operator)

### Monitoring and Logging
- Winston logger with daily rotation
- Health check endpoint at `/health`
- Prometheus metrics endpoint at `/metrics`
- Structured logging for production debugging

## Environment Configuration

### Backend Environment Variables
Key variables to configure in `backend/.env`:
- Database connection (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- Redis connection (REDIS_HOST, REDIS_PORT)
- JWT secrets (JWT_SECRET, JWT_REFRESH_SECRET)
- Email configuration for notifications
- Payment gateway credentials

### Frontend Environment Variables  
Key variables in `frontend/.env`:
- API URL (REACT_APP_API_URL)
- WebSocket URL (REACT_APP_WEBSOCKET_URL)
- Maps API keys for station locations
- Payment gateway public keys