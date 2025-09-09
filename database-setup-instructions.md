# Database Setup Instructions

## Step 1: Apply the SQL Updates

Run one of these SQL scripts in your database:

### Option A: Using the general update script
```sql
-- Run the contents of database-updates.sql in your PostgreSQL database
```

### Option B: Using the Prisma-specific migration
```sql
-- Run the contents of prisma-migration.sql in your PostgreSQL database
```

## Step 2: Sync Prisma Client

After running the SQL updates, execute these commands in your terminal:

```bash
# 1. Pull the current database schema to ensure Prisma schema is in sync
npx prisma db pull

# 2. Generate the Prisma client with the updated schema
npx prisma generate

# 3. (Optional) If you want to create a migration file for tracking
npx prisma migrate dev --name add_training_and_species_fields --create-only

# 4. Restart your development server
npm run dev
```

## Step 3: Verify the Changes

Check that the following are working:
1. Species can be created with `type` field at `/admin` or `/compliance/carers/new`
2. Training certificates can be managed at `/compliance/carers/training`
3. Training expiry alerts appear on the dashboard
4. All carer fields are saved correctly

## Troubleshooting

If you encounter the "Unknown argument `type`" error:
1. Stop your dev server
2. Clear Next.js cache: `rm -rf .next`
3. Regenerate Prisma client: `npx prisma generate`
4. Restart dev server: `npm run dev`

## Database Fields Added

### Species Table
- `type` - VARCHAR(50)
- `description` - TEXT
- `careRequirements` - TEXT  
- `scientificName` - VARCHAR(255)

### Carers Table
- `streetAddress` - VARCHAR(255)
- `suburb` - VARCHAR(255)
- `state` - VARCHAR(50)
- `postcode` - VARCHAR(10)
- `executivePosition` - VARCHAR(255)
- `speciesCoordinatorFor` - VARCHAR(255)
- `rehabilitatesKoala` - BOOLEAN
- `rehabilitatesFlyingFox` - BOOLEAN
- `rehabilitatesBirdOfPrey` - BOOLEAN
- `memberSince` - TIMESTAMP
- `trainingLevel` - VARCHAR(255)
- `specialties` - TEXT[]

### Carer Trainings Table (New)
- `id` - VARCHAR(30) PRIMARY KEY
- `carerId` - VARCHAR(30) FOREIGN KEY
- `courseName` - VARCHAR(255)
- `provider` - VARCHAR(255)
- `date` - TIMESTAMP
- `expiryDate` - TIMESTAMP
- `certificateUrl` - TEXT
- `notes` - TEXT
- `createdAt` - TIMESTAMP
- `updatedAt` - TIMESTAMP
- `clerkUserId` - VARCHAR(255)
- `clerkOrganizationId` - VARCHAR(255)