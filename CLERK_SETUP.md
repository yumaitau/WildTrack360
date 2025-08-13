# Clerk Authentication Setup for WildTrack360

This project now includes Clerk authentication to protect all routes and ensure only authenticated users can access the application.

## Setup Instructions

### 1. Create a Clerk Account
1. Go to [clerk.com](https://clerk.com) and sign up for an account
2. Create a new application
3. Choose "Next.js" as your framework

### 2. Get Your API Keys
1. In your Clerk dashboard, go to "API Keys"
2. Copy your `Publishable Key` and `Secret Key`

### 3. Configure Environment Variables
1. Copy `env.example` to `.env.local`
2. Update the Clerk environment variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 4. Configure Clerk Application
1. In your Clerk dashboard, go to "User & Authentication" → "Email, Phone, Username"
2. Enable the authentication methods you want (email, username, etc.)
3. Go to "Paths" and ensure the sign-in and sign-up paths match your configuration

### 5. Test the Application
1. Start your development server: `npm run dev`
2. Visit the application - you should be redirected to sign-in
3. Create an account or sign in
4. You should now have access to the protected routes

## How It Works

### Authentication Flow
1. **Unauthenticated users** are redirected to `/sign-in`
2. **New users** can sign up at `/sign-up`
3. **Authenticated users** can access all protected routes
4. **Sign out** is available in the header navigation

### Protected Routes
- All application routes are protected by default
- Only `/sign-in` and `/sign-up` are publicly accessible
- Static files and API routes are excluded from protection

### Components Used
- `SignedIn` - Shows content only to authenticated users
- `SignedOut` - Shows content only to unauthenticated users
- `SignInButton` - Button that opens the sign-in modal
- `SignUpButton` - Button that opens the sign-up modal
- `SignOutButton` - Button that signs out the current user
- `useUser` - Hook to access current user information

## Customization

### Styling
- Clerk components use your existing Tailwind CSS classes
- You can customize the appearance in your Clerk dashboard
- The sign-in and sign-up pages use your application's theme

### User Roles
- The application currently uses a hardcoded admin role
- You can extend this by using Clerk's user metadata or custom claims
- User information is available via the `useUser` hook

### Additional Features
- Multi-factor authentication
- Social login providers
- User management
- Organization support
- Webhooks for user events

## Troubleshooting

### Common Issues
1. **Environment variables not loaded** - Ensure `.env.local` is in your project root
2. **Authentication not working** - Check that your API keys are correct
3. **Redirect loops** - Verify your sign-in/sign-up URLs match Clerk configuration

### Support
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Discord](https://discord.gg/clerk)
- [GitHub Issues](https://github.com/clerkinc/clerk-nextjs/issues)
