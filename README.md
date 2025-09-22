# FileFoundry - Cloud File Management System

FileFoundry is a comprehensive cloud-based file management system that allows users to securely upload, store, organize, and share files with advanced features like deduplication, public sharing, folder management, and admin analytics.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-blue?style=for-the-badge&logo=google-cloud)](https://filefoundry-frontend-1064627085902.us-central1.run.app/)
[![Documentation](https://img.shields.io/badge/Documentation-View%20Docs-green?style=for-the-badge&logo=google-docs)](https://docs.google.com/document/d/1cFsoTcaIGDyxV54NbxgEs7B0T9SxcvaIT0JRFps2bzA/edit?tab=t.0)

## Admin Credentials

For testing and administration purposes, use the following credentials:

- **Email**: admin@gmail.com
- **Password**: admin

## Features

- **Secure File Upload & Storage**: Upload multiple file types with size limits and quotas
- **File Deduplication**: Automatic duplicate detection to optimize storage
- **Folder Organization**: Create and manage nested folder structures
- **File Sharing**: Share files with users or generate public links
- **User Management**: Role-based access control (Admin/User)
- **Storage Analytics**: Real-time storage usage and analytics
- **Public Files**: Make files publicly accessible
- **Admin Panel**: Comprehensive admin dashboard with user and file management
- **Responsive UI**: Modern React-based frontend with Material-UI

## Architecture

```mermaid
graph TB
    A[Client Browser] --> B[React Frontend]
    B --> C[Nginx Reverse Proxy]
    C --> D[Go Backend API]
    D --> E[PostgreSQL Database]
    D --> F[File Storage]
    D --> G[Cloud SQL Instance]
    
    subgraph "Frontend (React)"
        B1[Authentication]
        B2[File Upload]
        B3[File Management]
        B4[Admin Panel]
        B5[Analytics Dashboard]
    end
    
    subgraph "Backend (Go/Gin)"
        D1[REST API]
        D2[JWT Auth]
        D3[File Handlers]
        D4[User Management]
        D5[Storage Management]
        D6[Deduplication]
    end
    
    subgraph "Database (PostgreSQL)"
        E1[Users & Roles]
        E2[Files & Folders]
        E3[Sharing & Links]
        E4[Storage Analytics]
    end
    
    B --> B1
    B --> B2
    B --> B3
    B --> B4
    B --> B5
    
    D --> D1
    D --> D2
    D --> D3
    D --> D4
    D --> D5
    D --> D6
    
    E --> E1
    E --> E2
    E --> E3
    E --> E4
```

## Database Schema (ER Diagram)

```mermaid
erDiagram
    USERS {
        UUID id PK
        string username UK
        string email UK
        string password_hash
        string first_name
        string last_name
        bigint storage_quota
        bigint storage_used
        bigint total_uploaded_bytes
        bigint actual_storage_bytes
        bigint saved_bytes
        boolean is_active
        boolean email_verified
        timestamp last_login
        timestamp created_at
        timestamp updated_at
    }
    
    ROLES {
        UUID id PK
        string name UK
        string description
        timestamp created_at
        timestamp updated_at
    }
    
    USER_ROLES {
        UUID id PK
        UUID user_id FK
        UUID role_id FK
        timestamp assigned_at
        UUID assigned_by FK
    }
    
    FILES {
        UUID id PK
        string name
        string original_name
        bigint size
        string mime_type
        string storage_path
        UUID user_id FK
        UUID folder_id FK
        string visibility
        boolean is_deleted
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }
    
    FOLDERS {
        UUID id PK
        string name
        UUID user_id FK
        UUID parent_id FK
        boolean is_deleted
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }
    
    FILE_HASHES {
        UUID id PK
        string hash UK
        bigint size
        string storage_path
        int reference_count
        timestamp created_at
        timestamp updated_at
    }
    
    SHARE_LINKS {
        UUID id PK
        UUID file_id FK
        UUID user_id FK
        string token UK
        timestamp expires_at
        int download_count
        int max_downloads
        boolean is_active
        timestamp created_at
    }
    
    FILE_SHARES {
        UUID id PK
        UUID file_id FK
        UUID shared_by FK
        UUID shared_with FK
        string permission
        timestamp created_at
    }
    
    FOLDER_SHARES {
        UUID id PK
        UUID folder_id FK
        UUID shared_by FK
        UUID shared_with FK
        string permission
        timestamp created_at
    }
    
    FOLDER_SHARE_LINKS {
        UUID id PK
        UUID folder_id FK
        UUID user_id FK
        string token UK
        timestamp expires_at
        int access_count
        int max_access
        boolean is_active
        timestamp created_at
    }
    
    DOWNLOAD_STATS {
        UUID id PK
        UUID file_id FK
        UUID user_id FK
        string ip_address
        timestamp downloaded_at
    }
    
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : assigned_to
    USERS ||--o{ FILES : owns
    USERS ||--o{ FOLDERS : owns
    FOLDERS ||--o{ FILES : contains
    FOLDERS ||--o{ FOLDERS : parent_of
    FILES ||--o{ SHARE_LINKS : shared_via
    FILES ||--o{ FILE_SHARES : shared_with
    FOLDERS ||--o{ FOLDER_SHARES : shared_with
    FOLDERS ||--o{ FOLDER_SHARE_LINKS : shared_via
    FILES ||--o{ DOWNLOAD_STATS : tracked_in
    FILES ||--o{ FILE_HASHES : references
```

## Migration Flow

```mermaid
flowchart TD
    A[001_initial_schema.sql] --> B[002_create_indexes.sql]
    B --> C[003_seed_data.sql]
    C --> D[004_add_deleted_at_columns.sql]
    D --> E[004_file_deduplication.sql]
    E --> F[005_add_role_column.sql]
    F --> G[005_add_updated_at_to_file_hashes.sql]
    G --> H[006_add_user_role.sql]
    H --> I[011_update_admin_role.sql]
    I --> J[012_fix_storage_calculation.sql]
    J --> K[013_add_folder_sharing.sql]
    K --> L[013_file_sharing.sql]
    L --> M[014_add_gorm_columns_to_sharing_tables.sql]
    M --> N[014_update_user_storage_quota.sql]
    N --> O[015_add_public_visibility.sql]
    O --> P[015_recalculate_user_storage.sql]
    P --> Q[017_fix_admin_password_correct.sql]
    Q --> R[017_update_audit_logs_schema.sql]
    
    A1[Create Tables] --> A
    A2[Add Indexes] --> B
    A3[Seed Initial Data] --> C
    A4[Add Soft Delete] --> D
    A5[File Deduplication] --> E
    A6[Role Management] --> F
    A7[Hash Tracking] --> G
    A8[User Roles] --> H
    A9[Admin Setup] --> I
    A10[Storage Fix] --> J
    A11[Sharing Features] --> K
    A12[File Sharing] --> L
    A13[GORM Compatibility] --> M
    A14[Quota Management] --> N
    A15[Public Files] --> O
    A16[Storage Recalc] --> P
    A17[Admin Password] --> Q
    A18[Audit Logs] --> R
```

## Technology Stack

### Backend
- **Go 1.21** - Backend programming language
- **Gin Framework** - HTTP web framework
- **GORM** - ORM for database operations
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **UUID** - Unique identifiers

### Frontend
- **React 19** - Frontend framework
- **TypeScript** - Type-safe JavaScript
- **Material-UI (MUI)** - Component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Chart.js** - Data visualization
- **React Dropzone** - File upload component

### Infrastructure
- **Docker** - Containerization
- **Google Cloud Run** - Serverless deployment
- **Google Cloud SQL** - Managed PostgreSQL
- **Nginx** - Reverse proxy and static file serving

## Prerequisites

- **Node.js** 18+ and npm
- **Go** 1.21+
- **PostgreSQL** 13+
- **Docker** and Docker Compose (for containerized setup)
- **Google Cloud SDK** (for cloud deployment)

## Installation & Setup

### Method 1: Docker Setup (Recommended)

1. **Clone the repository:**
```bash
git clone <repository-url>
cd vit-2026-capstone-internship-hiring-task-Thanush-41
```

2. **Build and run with Docker Compose:**
```bash
docker-compose up --build
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Database: localhost:5432

### Method 2: Manual Setup

#### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install Go dependencies:**
```bash
go mod download
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Database Configuration
DATABASE_URL="host=localhost user=postgres password=your_password dbname=filefoundry_db sslmode=disable"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="your_password"
DB_NAME="filefoundry_db"
DB_SSLMODE="disable"

# Application Configuration
ENV="development"
PORT="8080"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="24"

# Storage Configuration
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="100MB"
DEFAULT_USER_QUOTA="10485760"  # 10MB
ADMIN_QUOTA="107374182400"     # 100GB

# Rate Limiting
ENABLE_RATE_LIMIT="true"
RATE_LIMIT="10"
RATE_LIMIT_WINDOW="1"
RATE_LIMIT_BURST="20"

# CORS Configuration
ALLOWED_ORIGINS="http://localhost:3000"
```

4. **Set up PostgreSQL database:**
```sql
CREATE DATABASE filefoundry_db;
CREATE USER filefoundry_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE filefoundry_db TO filefoundry_user;
```

5. **Run database migrations:**
```bash
# Install migrate tool
go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Run migrations
migrate -path migrations -database "postgres://filefoundry_user:your_password@localhost:5432/filefoundry_db?sslmode=disable" up
```

6. **Start the backend server:**
```bash
go run cmd/server/main.go
```

#### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` file:
```env
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
REACT_APP_BACKEND_URL=http://localhost:8080
```

4. **Start the development server:**
```bash
npm start
```

## Database Setup

### PostgreSQL Installation

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS:
```bash
brew install postgresql
brew services start postgresql
```

#### Windows:
Download and install from [PostgreSQL Official Website](https://www.postgresql.org/download/windows/)

### Database Configuration

1. **Create database and user:**
```sql
sudo -u postgres psql

CREATE DATABASE filefoundry_db;
CREATE USER filefoundry_user WITH PASSWORD 'securePassword123!';
GRANT ALL PRIVILEGES ON DATABASE filefoundry_db TO filefoundry_user;
ALTER USER filefoundry_user CREATEDB;
\q
```

2. **Test connection:**
```bash
psql -h localhost -U filefoundry_user -d filefoundry_db
```

### Migration Management

1. **Install migrate tool:**
```bash
# Using Go
go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Using curl (Linux/macOS)
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.16.2/migrate.linux-amd64.tar.gz | tar xvz
```

2. **Run migrations:**
```bash
# Up migrations
migrate -path backend/migrations -database "postgres://filefoundry_user:password@localhost:5432/filefoundry_db?sslmode=disable" up

# Down migrations
migrate -path backend/migrations -database "postgres://filefoundry_user:password@localhost:5432/filefoundry_db?sslmode=disable" down

# Check migration status
migrate -path backend/migrations -database "postgres://filefoundry_user:password@localhost:5432/filefoundry_db?sslmode=disable" version
```

## Environment Configuration

### Backend Environment Variables (.env)

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Configuration
DATABASE_URL="host=localhost user=postgres password=your_password dbname=filefoundry_db sslmode=disable"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="your_secure_password"
DB_NAME="filefoundry_db"
DB_SSLMODE="disable"

# Application Configuration
ENV="development"
PORT="8080"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="24"

# Storage Configuration
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="100MB"
DEFAULT_USER_QUOTA="10485760"  # 10MB in bytes
ADMIN_QUOTA="107374182400"     # 100GB in bytes

# Rate Limiting (Optional)
ENABLE_RATE_LIMIT="true"
RATE_LIMIT="10"
RATE_LIMIT_WINDOW="1"
RATE_LIMIT_BURST="20"

# CORS Configuration (Optional)
ALLOWED_ORIGINS="http://localhost:3000"
```

### Frontend Environment Variables (.env)

Create a `.env` file in the `frontend/` directory with the following variables:

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
REACT_APP_BACKEND_URL=http://localhost:8080

# Build Configuration (Optional)
GENERATE_SOURCEMAP=false
NODE_OPTIONS=--max_old_space_size=8192
```

### Environment Variables Reference

#### Backend Variables

| Variable | Description | Example Value | Required |
|----------|-------------|---------------|----------|
| `DATABASE_URL` | Full PostgreSQL connection string | `host=localhost user=postgres password=pass dbname=filefoundry_db sslmode=disable` | ✅ |
| `DB_HOST` | Database host | `localhost` | ✅ |
| `DB_PORT` | Database port | `5432` | ✅ |
| `DB_USER` | Database username | `postgres` | ✅ |
| `DB_PASSWORD` | Database password | `your_secure_password` | ✅ |
| `DB_NAME` | Database name | `filefoundry_db` | ✅ |
| `DB_SSLMODE` | SSL mode for database | `disable` | ✅ |
| `ENV` | Environment (development/production) | `development` | ✅ |
| `PORT` | Server port | `8080` | ✅ |
| `JWT_SECRET` | JWT signing secret (use strong secret in production) | `your-super-secret-jwt-key` | ✅ |
| `JWT_EXPIRATION` | JWT expiration hours | `24` | ✅ |
| `UPLOAD_DIR` | File upload directory | `./uploads` | ✅ |
| `MAX_FILE_SIZE` | Maximum file size | `100MB` | ✅ |
| `DEFAULT_USER_QUOTA` | Default user storage quota (bytes) | `10485760` (10MB) | ✅ |
| `ADMIN_QUOTA` | Admin storage quota (bytes) | `107374182400` (100GB) | ✅ |
| `ENABLE_RATE_LIMIT` | Enable rate limiting | `true` | ❌ |
| `RATE_LIMIT` | Requests per second | `10` | ❌ |
| `RATE_LIMIT_WINDOW` | Rate limit window (minutes) | `1` | ❌ |
| `RATE_LIMIT_BURST` | Rate limit burst | `20` | ❌ |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` | ❌ |

#### Frontend Variables

| Variable | Description | Example Value | Required |
|----------|-------------|---------------|----------|
| `REACT_APP_API_BASE_URL` | Backend API base URL | `http://localhost:8080/api/v1` | ✅ |
| `REACT_APP_BACKEND_URL` | Backend base URL | `http://localhost:8080` | ✅ |
| `GENERATE_SOURCEMAP` | Generate source maps | `false` | ❌ |
| `NODE_OPTIONS` | Node.js options for build | `--max_old_space_size=8192` | ❌ |

## Docker Configuration

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: filefoundry_db
      POSTGRES_USER: filefoundry_user
      POSTGRES_PASSWORD: securePassword123!
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: "host=postgres user=filefoundry_user password=securePassword123! dbname=filefoundry_db sslmode=disable"
      ENV: "development"
      JWT_SECRET: "your-super-secret-jwt-key"
    depends_on:
      - postgres
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      REACT_APP_API_BASE_URL: http://localhost:8080/api/v1
      REACT_APP_BACKEND_URL: http://localhost:8080
    depends_on:
      - backend

volumes:
  postgres_data:
```

## API Documentation

### Authentication Endpoints

#### POST /api/v1/auth/register
Register a new user account.

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "storageQuota": 10485760,
    "storageUsed": 0
  }
}
```

#### POST /api/v1/auth/login
Authenticate user and get JWT token.

#### GET /api/v1/auth/me
Get current user information (requires authentication).

### File Management Endpoints

#### POST /api/v1/files/upload
Upload a new file (requires authentication).

#### GET /api/v1/files
List user's files with pagination and filters.

#### GET /api/v1/files/:id
Get file details by ID.

#### GET /api/v1/files/:id/download
Download a file by ID.

#### DELETE /api/v1/files/:id
Delete a file (soft delete).

### Admin Endpoints

#### GET /api/v1/admin/users
Get all users (admin only).

#### GET /api/v1/admin/stats
Get system statistics and analytics.

#### PUT /api/v1/admin/users/:id/storage-quota
Update user storage quota.

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt for password security
- **Role-Based Access Control**: Admin and User roles
- **Rate Limiting**: Configurable request rate limiting
- **CORS Protection**: Cross-origin request protection
- **File Type Validation**: Whitelist-based file type checking
- **Storage Quotas**: Per-user storage limitations
- **Soft Delete**: Recoverable file deletion

## Performance Features

- **File Deduplication**: Automatic duplicate file detection and storage optimization
- **Chunked Upload**: Large file upload with progress tracking
- **Database Indexing**: Optimized database queries
- **Connection Pooling**: Efficient database connection management
- **Static File Serving**: Optimized file delivery

## Deployment

### Google Cloud Run Deployment

1. **Build and deploy backend:**
```bash
cd backend
gcloud run deploy filefoundry-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file env-vars.yaml \
  --memory 1Gi \
  --cpu 1
```

2. **Build and deploy frontend:**
```bash
cd frontend
npm run build
gcloud run deploy filefoundry-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1
```

### Traditional Server Deployment

1. **Build backend:**
```bash
cd backend
CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go
```

2. **Build frontend:**
```bash
cd frontend
npm run build
```

3. **Deploy with systemd service or process manager**

## Monitoring & Analytics

### Available Metrics
- User registration trends
- File upload statistics
- Storage usage analytics
- Download tracking
- Deduplication savings
- System performance metrics

### Admin Dashboard Features
- Real-time user statistics
- File management interface
- Storage quota management
- System health monitoring
- User activity tracking

## Testing

### Backend Tests
```bash
cd backend
go test ./...
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
docker-compose -f docker-compose.test.yml up --build
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues:**
   - Verify PostgreSQL is running
   - Check connection credentials
   - Ensure database exists

2. **File Upload Issues:**
   - Check upload directory permissions
   - Verify storage quota limits
   - Check file size limits

3. **Frontend Not Loading:**
   - Verify backend API is running
   - Check CORS configuration
   - Verify environment variables

4. **Memory Issues During Build:**
   - Increase Node.js heap size: `export NODE_OPTIONS="--max_old_space_size=8192"`
   - Use Docker for consistent builds

### Logs

- **Backend logs:** Check console output or log files
- **Frontend logs:** Check browser console
- **Database logs:** Check PostgreSQL logs

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

## Project Description

FileFoundry is a modern, cloud-native file management system designed to provide secure, efficient, and user-friendly file storage and sharing capabilities. Built with a microservices architecture using Go for the backend and React for the frontend, it offers enterprise-grade features while maintaining simplicity and performance.

### Key Highlights:
- **Security First**: JWT authentication, role-based access control, and secure file handling
- **Smart Storage**: Automatic file deduplication and intelligent storage management
- **Analytics**: Comprehensive admin dashboard with real-time analytics
- **Modern UI**: Responsive React interface with Material-UI components
- **Cloud Ready**: Designed for containerized deployment on cloud platforms
- **Performance**: Optimized database queries, chunked uploads, and efficient file serving
- **Extensible**: Well-structured codebase with clear separation of concerns

This system is ideal for organizations needing a robust file management solution with advanced sharing capabilities, storage optimization, and comprehensive administrative controls.#   F i l e F o u n d r y - V a u l t  
 