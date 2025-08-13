# Database Setup Guide for WildTrack360

This guide will help you set up PostgreSQL with Prisma ORM for WildTrack360.

## Prerequisites

1. **PostgreSQL Database** - You can use:
   - Local PostgreSQL installation
   - Cloud service (Supabase, Neon, Railway, etc.)
   - Docker container

2. **Node.js and npm** - Already installed in your project

## Setup Steps

### 1. Install Dependencies

The Prisma dependencies are already installed:
```bash
npm install prisma @prisma/client
```

### 2. Configure Environment Variables

1. Copy `env.example` to `.env.local`:
```bash
cp env.example .env.local
```

2. Update the `DATABASE_URL` in `.env.local`:
```bash
# For local PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/wildtrack360?schema=public"

# For Supabase
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# For Neon
DATABASE_URL="postgresql://[USERNAME]:[PASSWORD]@[ENDPOINT]/[DATABASE]?sslmode=require"
```

### 3. Database Setup Options

#### Option A: Local PostgreSQL

1. Install PostgreSQL:
   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. Create database:
   ```bash
   createdb wildtrack360
   ```

#### Option B: Docker PostgreSQL

1. Create a `docker-compose.yml` file:
   ```yaml
   version: '3.8'
   services:
     db:
       image: postgres:15
       restart: always
       environment:
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=password
         - POSTGRES_DB=wildtrack360
       ports:
         - '5432:5432'
       volumes:
         - db:/var/lib/postgresql/data
   
   volumes:
     db:
       driver: local
   ```

2. Start the database:
   ```bash
   docker-compose up -d
   ```

#### Option C: Cloud Services

- **Supabase**: Free tier with 500MB database
- **Neon**: Free tier with 3GB database
- **Railway**: Free tier with 1GB database

### 4. Initialize Database

1. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

2. Create and apply database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

3. (Optional) Seed the database with sample data:
   ```bash
   npx prisma db seed
   ```

### 5. Verify Setup

1. Check database connection:
   ```bash
   npx prisma studio
   ```

2. This will open Prisma Studio in your browser where you can view and edit your database.

## Database Schema Overview

The database includes the following main models:

- **ClerkUser**: Stores user information from Clerk authentication
- **ClerkOrganization**: Stores organization information from Clerk
- **Animal**: Core wildlife records with status tracking
- **Record**: Detailed records for each animal (feeding, medical, etc.)
- **Photo**: Photo management for animals
- **Species**: Species catalog with care requirements
- **Carer**: Wildlife carer information and licensing
- **HygieneLog**: Compliance hygiene tracking
- **IncidentReport**: Incident reporting and tracking
- **ReleaseChecklist**: Release preparation checklists
- **Asset**: Equipment and asset management

## Key Features

- **Multi-tenant**: Each organization's data is isolated
- **User-specific**: All records are tied to specific users
- **Audit trail**: Created/updated timestamps on all records
- **Relationships**: Proper foreign key relationships between models
- **Type safety**: Full TypeScript support with Prisma

## Troubleshooting

### Common Issues

1. **Connection refused**: Check if PostgreSQL is running
2. **Authentication failed**: Verify username/password in DATABASE_URL
3. **Database doesn't exist**: Create the database first
4. **Permission denied**: Check database user permissions

### Reset Database

If you need to start fresh:
```bash
npx prisma migrate reset
```

### View Database Logs

```bash
# Docker
docker-compose logs db

# Local PostgreSQL
tail -f /var/log/postgresql/postgresql-*.log
```

## Production Considerations

1. **Connection Pooling**: Use Prisma Accelerate or connection pooling
2. **Backups**: Set up regular database backups
3. **Monitoring**: Monitor database performance and connections
4. **Security**: Use environment variables for sensitive data
5. **Migrations**: Always test migrations in staging first

## Next Steps

After setting up the database:

1. Configure Clerk authentication
2. Test the application with real data
3. Set up any additional indexes for performance
4. Configure backup and monitoring

For more information, see the [Prisma documentation](https://www.prisma.io/docs).
