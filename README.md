# Staff Control System

Advanced multi-organization staff monitoring and access control system built with NestJS, featuring comprehensive employee tracking, computer activity monitoring, and access management.

## Features

### 🏢 **Multi-Organization Architecture**
- **Complete Data Isolation**: Secure separation between organizations
- **Hierarchical Structure**: Organization → Department → Employee
- **Role-Based Access Control**: ADMIN, HR, DEPARTMENT_LEAD, GUARD
- **Scoped Data Access**: Automatic data filtering based on user roles and organization

### 👥 **Employee Management**
- **Comprehensive Employee Profiles**: Full employee information with photos
- **Department Assignment**: Flexible department-based organization
- **Policy Management**: Configurable monitoring policies per employee
- **Credential Management**: Card and car assignment system
- **Activity Tracking**: Real-time employee activity monitoring

### 🖥️ **Computer Activity Monitoring**
- **Real-time Monitoring**: Track active windows, visited sites, and screenshots
- **User Session Management**: Monitor login/logout and session activities
- **Application Usage**: Track time spent in different applications
- **Website Monitoring**: Monitor visited websites with categorization
- **Screenshot Capture**: Configurable screenshot intervals with privacy controls

### 🚪 **Access Control System**
- **Multi-Modal Authentication**: Support for cards, QR codes, photos, and personal codes
- **Gate Management**: Multiple entry/exit points with device integration
- **Entry Logging**: Comprehensive entry/exit tracking with timestamps
- **Visitor Management**: Guest access with approval workflows
- **Device Integration**: Support for various access control devices

### 📊 **Reporting & Analytics**
- **Activity Reports**: Detailed employee activity analysis
- **Entry/Exit Reports**: Comprehensive access logs
- **Time Tracking**: Work hours and attendance analytics
- **Custom Reports**: Flexible reporting with date ranges and filters
- **Export Capabilities**: Data export in various formats

### 🔒 **Security & Compliance**
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Permissions**: Granular permission system
- **Audit Logging**: Complete audit trails for compliance
- **Data Encryption**: Secure data storage and transmission
- **Privacy Controls**: Configurable privacy settings for monitoring

## Technology Stack

### **Backend Framework**
- **NestJS**: Modern Node.js framework with TypeScript
- **TypeScript**: Type-safe development with advanced features
- **Prisma ORM**: Type-safe database access with PostgreSQL

### **Database & Storage**
- **PostgreSQL**: Primary database for structured data
- **Redis**: Caching and session management
- **BullMQ**: Background job processing and queues
- **File Storage**: Local and cloud storage support

### **Security & Authentication**
- **JWT**: JSON Web Token authentication
- **Passport.js**: Authentication middleware
- **bcrypt**: Password hashing and security
- **Role-based Access Control**: Granular permissions

### **API & Documentation**
- **Swagger/OpenAPI**: Comprehensive API documentation
- **Class Validator**: Request validation and sanitization
- **Custom Decorators**: Enhanced Swagger documentation

### **Development & Testing**
- **Jest**: Unit and integration testing
- **Testcontainers**: Database testing with Docker
- **ESLint & Prettier**: Code quality and formatting
- **Husky**: Git hooks for quality assurance

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sector-staff-v2
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start infrastructure services:
```bash
docker-compose up -d
```

5. Generate Prisma client and run migrations:
```bash
pnpm run db:generate
pnpm run db:migrate
```

6. Start the development server:
```bash
pnpm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`

### Environment Variables

See `.env.example` for all required environment variables.

## Project Structure

```
src/
├── app/                     # Main application module
│   ├── app.controller.ts    # Root controller
│   ├── app.service.ts       # Root service
│   └── health/              # Health check endpoints
├── core/                    # Core infrastructure modules
│   ├── config/              # Configuration management
│   ├── database/            # Database connection
│   ├── prisma/              # Prisma ORM service
│   ├── logger/              # Logging service
│   └── queue/               # BullMQ job processing
├── shared/                  # Shared utilities and components
│   ├── constants/           # Application constants
│   ├── decorators/          # Custom decorators (Auth, Roles, Scope)
│   ├── dto/                 # Data Transfer Objects
│   ├── enums/               # Type enumerations
│   ├── guards/              # Security guards (JWT, Roles, Scope)
│   ├── interfaces/          # TypeScript interfaces
│   ├── repositories/        # Base repository pattern
│   └── utils/               # Helper functions and utilities
├── modules/                 # Business domain modules
│   ├── auth/                # Authentication & authorization
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── strategies/      # Passport strategies
│   ├── user/                # User management
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.module.ts
│   ├── organization/        # Organization management
│   │   ├── organization.controller.ts
│   │   ├── organization.service.ts
│   │   └── organization.module.ts
│   ├── department/          # Department management
│   │   ├── department.controller.ts
│   │   ├── department.service.ts
│   │   └── department.module.ts
│   └── employee/            # Employee management
│       ├── employee.controller.ts
│       ├── employee.service.ts
│       ├── employee.repository.ts
│       └── employee.module.ts
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma        # Database schema definition
│   └── migrations/          # Database migration files
└── main.ts                  # Application entry point
```

## API Documentation

The API follows RESTful conventions with comprehensive Swagger documentation available at `/api/docs`

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

### Core Endpoints

#### **Authentication**
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout
- `POST /auth/validate` - Token validation

#### **User Management**
- `GET /users` - List users (Admin only)
- `POST /users` - Create user (Admin only)
- `GET /users/:id` - Get user details
- `PUT /users/:id` - Update user
- `PUT /users/:id/password` - Change password
- `PUT /users/:id/activate` - Activate user
- `PUT /users/:id/deactivate` - Deactivate user

#### **Organization Management**
- `GET /organization` - List organizations (Admin only)
- `POST /organization` - Create organization (Admin only)
- `GET /organization/:id` - Get organization details
- `GET /organization/self` - Get current user's organization
- `PUT /organization/:id` - Update organization
- `DELETE /organization/:id` - Delete organization

#### **Department Management**
- `GET /departments` - List departments
- `POST /departments` - Create department
- `GET /departments/:id` - Get department details
- `GET /departments/self` - Get current user's department
- `PUT /departments/:id` - Update department
- `DELETE /departments/:id` - Delete department

#### **Employee Management**
- `GET /employees` - List employees with filtering and pagination
- `POST /employees` - Create new employee
- `PUT /employees/:id` - Update employee
- `DELETE /employees/:id` - Delete employee
- `GET /employees/:id/entry-logs` - Get employee entry/exit logs
- `GET /employees/:id/activity-report` - Get employee activity report
- `GET /employees/:id/computer-users` - Get linked computer users
- `POST /employees/:id/assign-card` - Assign access card
- `POST /employees/:id/assign-car` - Assign vehicle
- `POST /employees/:id/link-computer-user` - Link computer user
- `DELETE /employees/:id/unlink-computer-user/:computer_user_id` - Unlink computer user

#### **System Administration**
- `GET /admin/queues/stats` - Queue statistics
- `GET /admin/queues/:queueName/stats` - Specific queue stats
- `POST /admin/queues/:queueName/clean` - Clean queue
- `POST /admin/queues/:queueName/retry-failed` - Retry failed jobs
- `GET /admin/queues/health` - Queue health status

#### **Health & Monitoring**
- `GET /` - API status
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with dependencies

### Authentication & Authorization

#### **Roles**
- **ADMIN**: Full system access
- **HR**: Organization-level employee management
- **DEPARTMENT_LEAD**: Department-level access
- **GUARD**: Basic read access for security

#### **Data Scoping**
- Automatic data filtering based on user role and organization
- Department leads see only their department's data
- HR sees organization-wide data
- Guards have read-only access to relevant information

### Request/Response Format

#### **Standard Response Structure**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### **Paginated Response Structure**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

#### **Error Response Structure**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...]
  }
}
```

## Testing

```bash
# Unit tests
pnpm run test

# Integration tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Development

```bash
# Start in development mode
pnpm run start:dev

# Build for production
pnpm run build

# Start production server
pnpm run start:prod
```

## Database Schema

The system uses PostgreSQL with Prisma ORM for type-safe database operations.

### **Core Entities**

#### **User Management**
- `User` - System users with role-based access
- `Organization` - Top-level organizational units
- `Department` - Organizational departments within organizations

#### **Employee Management**
- `Employee` - Employee profiles with personal information
- `Credential` - Access credentials (cards, codes, etc.)
- `Policy` - Monitoring and access policies

#### **Computer Monitoring**
- `ComputerUser` - Computer user accounts linked to employees
- `Computer` - Physical computer information
- `UsersOnComputers` - Junction table for user-computer relationships
- `ActiveWindow` - Active application window tracking
- `VisitedSite` - Website visit tracking
- `Screenshot` - Screenshot capture records
- `UserSession` - Login/logout session tracking

#### **Access Control**
- `Action` - Entry/exit events and access attempts
- `Gate` - Physical access points
- `Device` - Access control devices (readers, cameras)
- `Visitor` - Guest/visitor management
- `OnetimeCode` - Temporary access codes

#### **Policy Management**
- `Policy` - Monitoring policies
- `ScreenshotOption` - Screenshot configuration
- `VisitedSitesOption` - Website monitoring settings
- `ActiveWindowsOption` - Application monitoring settings
- `WebsiteGroup` / `AppGroup` - Categorization for monitoring

### **Database Commands**

```bash
# Generate Prisma client
pnpm run db:generate

# Create and apply migration
pnpm run db:migrate

# Deploy migrations (production)
pnpm run db:deploy

# Reset database (development only)
pnpm run db:reset

# Seed database with sample data
pnpm run db:seed

# View database in Prisma Studio
pnpm run db:studio
```

### **Key Relationships**

- Organizations contain multiple Departments
- Departments contain multiple Employees
- Employees can have multiple Credentials and ComputerUsers
- ComputerUsers track activity through UsersOnComputers
- Actions log all access events for Employees and Visitors
- Policies define monitoring rules for Employees

## Configuration

### **Environment Variables**

Create a `.env` file based on `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/staff_control"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis Configuration
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# Application
NODE_ENV="development"
PORT=3000
API_PREFIX="api"

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DEST="./uploads"

# Queue Configuration
QUEUE_REDIS_HOST="localhost"
QUEUE_REDIS_PORT=6379
```

### **Docker Configuration**

The project includes Docker support for easy deployment:

```bash
# Start all services
docker-compose up -d

# Start only database and redis
docker-compose up -d postgres redis

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Deployment

### **Production Deployment**

1. **Build the application**:
```bash
pnpm run build
```

2. **Set production environment variables**:
```bash
export NODE_ENV=production
export DATABASE_URL="your-production-database-url"
export JWT_SECRET="your-production-jwt-secret"
```

3. **Run database migrations**:
```bash
pnpm run db:deploy
```

4. **Start the application**:
```bash
pnpm run start:prod
```

### **Docker Deployment**

```bash
# Build production image
docker build -t staff-control-system .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring & Observability

### **Health Checks**
- Basic health check at `/health`
- Detailed health check at `/health/detailed`
- Queue health monitoring at `/admin/queues/health`

### **Logging**
- Structured logging with Winston
- Request/response logging
- Error tracking and reporting
- Audit trail logging

### **Metrics**
- Queue processing metrics
- Database performance monitoring
- API response time tracking
- System resource monitoring

## Security Considerations

### **Authentication & Authorization**
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Data scoping based on organizational hierarchy
- Secure password hashing with bcrypt

### **Data Protection**
- Input validation and sanitization
- SQL injection prevention with Prisma
- XSS protection with proper encoding
- Rate limiting on sensitive endpoints

### **Privacy Controls**
- Configurable monitoring policies
- Screenshot privacy settings
- Data retention policies
- User consent management

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commit messages
- Update documentation for new features
- Ensure all tests pass before submitting PR

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation at `/api/docs`
- Review the test files for usage examples

## License

This project is licensed under the UNLICENSED License - see the LICENSE file for details.
