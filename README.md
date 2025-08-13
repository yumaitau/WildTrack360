# WildTrack360 - Wildlife Conservation Management System

WildTrack360 is a comprehensive wildlife conservation management application designed to help wildlife carers track animals throughout their entire lifecycle, from initial admission to release or unfortunate outcomes.

## 🚀 Features

- **Animal Management**: Complete lifecycle tracking from admission to release
- **Multi-tenant Architecture**: Support for multiple organizations with data isolation
- **User Authentication**: Secure authentication with Clerk
- **Compliance Tracking**: Built-in compliance management for different jurisdictions
- **Photo Management**: Comprehensive photo documentation system
- **Reporting**: Detailed analytics and reporting capabilities
- **Mobile Responsive**: Works seamlessly on all devices

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript
- **Authentication**: Clerk for user and organization management
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts for data visualization
- **Maps**: OpenStreetMap integration for location services

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local, Docker, or cloud)
- Clerk account for authentication

## 🛠️ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/wildtrack360.git
cd wildtrack360
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database

#### Option A: Docker (Recommended for development)

```bash
# Start PostgreSQL and pgAdmin
docker-compose up -d

# The database will be available at localhost:5432
# pgAdmin will be available at http://localhost:8080
```

#### Option B: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb wildtrack360
```

#### Option C: Cloud Database

Use services like Supabase, Neon, or Railway for cloud-hosted PostgreSQL.

### 4. Configure Environment Variables

```bash
# Copy environment template
cp env.example .env.local

# Update with your values
# - Clerk authentication keys
# - Database connection string
# - Organization details
```

### 5. Set Up Clerk Authentication

1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. Get your API keys and update `.env.local`
4. Configure sign-in and sign-up URLs

### 6. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### 7. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 🗄️ Database Schema

WildTrack360 uses a comprehensive database schema with the following key models:

- **Animals**: Core wildlife records with status tracking
- **Records**: Detailed activity logs (feeding, medical, behavior)
- **Photos**: Photo documentation system
- **Species**: Species catalog with care requirements
- **Carers**: Wildlife carer information and licensing
- **Compliance**: Hygiene logs, incident reports, release checklists
- **Assets**: Equipment and asset management

All data is properly isolated by organization and user for security and privacy.

## 🔐 Authentication & Security

- **Clerk Integration**: Professional authentication with organization support
- **Multi-tenant**: Data isolation between organizations
- **User Management**: Role-based access control
- **Secure API**: Protected routes with middleware
- **Data Privacy**: User-specific data access

## 📱 User Interface

- **Modern Design**: Clean, intuitive interface built with shadcn/ui
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Dark Mode**: Built-in dark/light theme support
- **Accessibility**: WCAG compliant design patterns
- **Performance**: Optimized for fast loading and smooth interactions

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

- **Netlify**: Static site hosting
- **Railway**: Full-stack deployment with database
- **AWS**: EC2 with RDS for database
- **Docker**: Containerized deployment

## 📚 Documentation

- [Database Setup Guide](DATABASE_SETUP.md)
- [Clerk Authentication Setup](CLERK_SETUP.md)
- [API Documentation](docs/api.md)
- [User Guide](docs/user-guide.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the docs folder and setup guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join community discussions on GitHub Discussions

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Components from [shadcn/ui](https://ui.shadcn.com/)
- Authentication by [Clerk](https://clerk.com/)
- Database powered by [Prisma](https://www.prisma.io/)

---

**WildTrack360** - Empowering wildlife conservation through technology.