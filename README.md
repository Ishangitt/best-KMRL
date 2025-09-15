# KMRL Train Scheduler

A comprehensive web application for the Kochi Metro Rail Limited (KMRL) train scheduling system, providing real-time schedule information, seat booking, and route planning capabilities.

## Features

### Core Functionality
- **Real-time Schedule Display**: Live train schedules with current status and delays
- **Interactive Route Planning**: Smart route suggestions with multiple transport options
- **Seat Booking System**: Online reservation with seat selection and payment integration
- **Multi-language Support**: Available in English, Malayalam, and Hindi
- **Mobile-responsive Design**: Optimized for all device types

### User Features
- User registration and profile management
- Booking history and trip management
- Real-time notifications for schedule changes
- Offline schedule access
- QR code ticket generation
- Payment gateway integration

### Admin Features
- Schedule management and updates
- Route configuration
- Capacity management
- Analytics and reporting
- User management
- Emergency announcements

## Architecture

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI)
- **Styling**: CSS Modules with SCSS
- **PWA**: Service Workers for offline functionality

### Backend (Node.js/Express)
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT with refresh tokens
- **API**: RESTful API with OpenAPI documentation
- **WebSockets**: Socket.io for real-time updates
- **File Upload**: Multer for image handling

### Database
- **Primary**: PostgreSQL 14+
- **Caching**: Redis for session management
- **Search**: Elasticsearch for route optimization
- **Migrations**: Knex.js for schema management

### DevOps
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + ELK Stack

## Project Structure

```
kmrl-train-scheduler/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── config/          # Configuration files
│   ├── tests/               # Backend tests
│   └── package.json
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── assets/          # Static assets
│   ├── public/              # Public assets
│   └── package.json
├── database/                # Database files
│   ├── migrations/          # Database migrations
│   ├── seeds/               # Seed data
│   └── schema.sql           # Database schema
├── docs/                    # Documentation
│   ├── api/                 # API documentation
│   ├── deployment/          # Deployment guides
│   └── user-guide/          # User documentation
├── docker-compose.yml       # Development environment
├── Dockerfile.backend       # Backend container
├── Dockerfile.frontend      # Frontend container
└── README.md
```

## Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **PostgreSQL**: 14.0 or higher
- **Redis**: 6.0 or higher
- **Docker**: (Optional) for containerized development

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd kmrl-train-scheduler
```

### 2. Environment Setup
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Update environment variables with your configuration
```

### 3. Database Setup
```bash
# Start PostgreSQL and Redis (if using Docker)
docker-compose up -d postgres redis

# Run database migrations
cd backend
npm run migrate:latest
npm run seed:run
```

### 4. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 5. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 6. Using Docker (Alternative)
```bash
# Start all services
docker-compose up

# Build and start in production mode
docker-compose -f docker-compose.prod.yml up --build
```

## Development

### Available Scripts

#### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run linting
npm run migrate      # Run database migrations
```

#### Frontend
```bash
npm start            # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run linting
npm run analyze      # Analyze bundle size
```

### API Documentation
- Development: http://localhost:3001/api/docs
- Swagger/OpenAPI documentation available at `/api/docs`

### Testing
```bash
# Run all tests
npm run test

# Run backend tests
cd backend && npm run test

# Run frontend tests
cd frontend && npm run test

# Run integration tests
npm run test:integration
```

## Deployment

### Production Deployment
1. **Environment Configuration**
   - Set production environment variables
   - Configure database connections
   - Set up SSL certificates

2. **Build Applications**
   ```bash
   # Build backend
   cd backend && npm run build
   
   # Build frontend
   cd frontend && npm run build
   ```

3. **Deploy using Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Monitoring and Logging
- **Application Logs**: Available in `/logs` directory
- **Metrics**: Prometheus metrics at `/metrics` endpoint
- **Health Check**: Available at `/health` endpoint

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- **Backend**: ESLint + Prettier with TypeScript
- **Frontend**: ESLint + Prettier with React/TypeScript rules
- **Commits**: Follow conventional commit format

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- **Documentation**: [docs/](./docs/)
- **Issues**: GitHub Issues
- **Contact**: [Your Contact Information]

## Acknowledgments

- Kochi Metro Rail Limited (KMRL) for project requirements
- Open source community for the amazing tools and libraries
- Contributors who help improve this project

---

**Note**: This is a development project for educational/demonstration purposes. For production use with actual KMRL systems, additional security, compliance, and performance considerations would be required.