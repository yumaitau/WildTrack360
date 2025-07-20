# WildHub - Wildlife Conservation Management System

WildHub is a comprehensive wildlife conservation management application designed to help wildlife carers track animals throughout their entire lifecycle, from initial admission to release or unfortunate passing. The system also manages critical assets like GPS trackers and equipment to ensure efficient wildlife care operations.

## 🖼️ Screenshots

### Main Dashboard
The dashboard provides a comprehensive overview of your wildlife conservation operations with real-time statistics and visual data:

![WildHub Dashboard](docs/images/dashboard.png)

**Features shown:**
- **Summary Cards**: Quick stats showing 7 animals in care, 2 total releases, and +2 recent admissions
- **Species Distribution Chart**: Visual breakdown of animals by species (Koala, Possum, Wombat, Turtle, Kookaburra, Echidna, Kangaroo)
- **Carer Workload Chart**: Distribution of animals among carers (John Smith, Susan Williams, Jane Doe, Peter Jones)
- **Action Buttons**: Add Animal, Export All, and Settings options

### Recent Admissions & Animal Records
Track admissions over time and browse individual animal profiles:

![Recent Admissions & Animal Records](docs/images/recent-admissions.png)

**Features shown:**
- **Admissions Chart**: 30-day bar chart showing admissions on July 10th, 15th, and 16th
- **Animal Cards**: Grid view of animals (Kimmy, Pete, Willy, Tina) with photo placeholders
- **Search Functionality**: Search bar for finding specific animals
- **View Options**: Toggle between grid and list views

### Individual Animal Management
Detailed view for managing individual animals and their care records:

![Individual Animal Management](docs/images/animal-management.png)

**Features shown:**
- **Animal Profile**: Complete details for "Pete" (Possum) including status, carer assignment, and admission date
- **Care Records**: Add new activity logs with record types, dates, and detailed notes
- **Photo Gallery**: Upload and manage photos documenting the animal's journey
- **Data Export**: Download comprehensive animal records to CSV

### Administrative Panel - Species Management
Manage the species database and track conservation efforts:

![Species Management](docs/images/species-management.png)

**Features shown:**
- **Species List**: Current species (Echidna, Kangaroo, Koala) with edit/delete actions
- **Add Species**: Input field and button for adding new species
- **Navigation Tabs**: Switch between Species, Carers, and Assets management

### Administrative Panel - Asset Management
Track GPS trackers and equipment inventory:

![Asset Management](docs/images/asset-management.png)

**Features shown:**
- **Asset List**: GPS Trackers (#A45, #A46) and Incubator with status tracking
- **Asset Types**: Tracker and Equipment categories
- **Status Monitoring**: Available, In Use, and Maintenance statuses
- **Add Assets**: Input field with type dropdown for adding new assets

## 🌿 Features

### 📊 Dashboard Overview
- **Real-time Statistics**: Track animals currently in care, total releases, and recent admissions
- **Species Distribution**: Visual breakdown of animals by species with interactive charts
- **Carer Workload Management**: Monitor animal distribution across carers to ensure balanced workloads
- **Recent Admissions Tracking**: View admission trends over the last 30 days with interactive filtering

### 🐨 Animal Lifecycle Management
- **Complete Animal Profiles**: Detailed records including species, carer assignment, and admission date
- **Care Activity Logging**: Add detailed records for each care activity with timestamps and notes
- **Photo Gallery**: Upload and manage photos for each animal's journey
- **Status Tracking**: Monitor animals from "In Care" to "Released" or "Deceased"
- **Data Export**: Export individual animal records to CSV format

### 👥 Carer Management
- **Carer Assignment**: Assign animals to specific carers with workload balancing
- **Performance Tracking**: Monitor carer performance and animal outcomes
- **Workload Distribution**: Visual charts showing animal distribution across carers

### 🏷️ Species Management
- **Species Database**: Maintain a comprehensive list of wildlife species
- **Add/Edit/Delete**: Full CRUD operations for species management
- **Species-specific Tracking**: Track animals by species for conservation insights

### 📱 Asset Management
- **GPS Tracker Management**: Track GPS devices assigned to animals
- **Equipment Inventory**: Manage incubators, medical equipment, and other assets
- **Status Monitoring**: Track asset availability (Available, In Use, Maintenance)
- **Asset Assignment**: Link assets to specific animals or carers

### 🔍 Search and Filtering
- **Animal Search**: Find specific animals by name or characteristics
- **Grid/List Views**: Toggle between different viewing modes
- **Date-based Filtering**: Filter records by admission dates and time periods

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser
- Google AI API key (for AI features)
- Firebase project setup (for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/wildhub.git
   cd wildhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration values.

4. **Run the development server**
   ```bash
   npm run dev
   ```
   This starts the development server with Turbopack on port 9002.

5. **Open your browser**
   Navigate to [http://localhost:9002](http://localhost:9002)

### Building for Production

```bash
npm run build
npm start
```

### Available Scripts

- `npm run dev` - Start development server with Turbopack on port 9002
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit AI development server
- `npm run genkit:watch` - Start Genkit AI with watch mode

## 🏗️ Project Structure

```
WildHub/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── admin/             # Admin panel pages
│   │   ├── animals/           # Animal management pages
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Base UI components
│   │   └── *.tsx             # Feature-specific components
│   ├── lib/                  # Utility functions and data
│   └── hooks/                # Custom React hooks
├── public/                   # Static assets
└── docs/                     # Documentation
```

## 🛠️ Technology Stack

- **Framework**: Next.js 15.3.3 with App Router and Turbopack
- **Styling**: Tailwind CSS 3.4.1 with animations
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Charts**: Recharts 2.15.1 for data visualization
- **Icons**: Lucide React 0.475.0
- **TypeScript**: Full type safety with React 18.3.1
- **Forms**: React Hook Form 7.54.2 with Zod validation
- **Tables**: TanStack React Table 8.19.3
- **AI Integration**: Genkit 1.14.1 with Google AI
- **Database**: Firebase 11.9.1
- **Date Handling**: date-fns 3.6.0
- **Carousel**: Embla Carousel React 8.6.0

## 📋 Key Components

- **Dashboard Stats**: Real-time statistics and metrics using Recharts
- **Animal Cards**: Individual animal profile displays with responsive design
- **Charts**: Species distribution and carer workload visualizations with Recharts
- **Forms**: Add animal, record, and asset management forms with React Hook Form and Zod validation
- **Tables**: Data display for animals, species, and assets using TanStack React Table
- **Dialogs**: Modal interfaces for adding/editing records with Radix UI
- **AI Integration**: Genkit-powered features for enhanced functionality
- **Carousel**: Image galleries and content sliders with Embla Carousel

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.