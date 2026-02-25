"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-gray-600">
          You don&apos;t have permission to access this organization. Please
          make sure you&apos;re signed in to the correct account.
        </p>
        <div className="flex flex-col gap-3">
          <SignOutButton redirectUrl="/">
            <button className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
