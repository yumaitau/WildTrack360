'use client';

export function ThankYouScreen() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">✅</div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Thank You!
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Your location and photos have been submitted successfully. Our team will
        review the information and follow up as needed.
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500">
        You can safely close this page.
      </p>
    </div>
  );
}
