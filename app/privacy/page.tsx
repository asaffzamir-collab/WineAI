import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-ivory-200 px-4 py-12 dark:bg-charcoal-900">
      <article className="mx-auto max-w-2xl space-y-6 text-stone-700 dark:text-stone-300">
        <Link href="/" className="text-sm text-bordeaux-400 hover:text-bordeaux-600 transition-colors dark:text-bordeaux-300">
          &larr; Back to app
        </Link>

        <h1 className="heading-serif text-3xl text-bordeaux-600 dark:text-ivory-200">Privacy Policy</h1>
        <p className="text-sm text-stone-500">Last updated: February 2026</p>

        <section className="space-y-3">
          <h2 className="heading-serif text-xl text-bordeaux-600 dark:text-ivory-200">What we collect</h2>
          <p>WineJourney collects the minimum data needed to provide you with a personalized wine experience:</p>
          <ul className="list-disc space-y-1 ps-6">
            <li>Your email address (for authentication)</li>
            <li>Display name (optional, for personalization)</li>
            <li>Wine taste preferences (from the onboarding quiz and wines you like)</li>
            <li>Your cellar and wishlist data</li>
            <li>Wine search queries and uploaded images (processed by OpenAI for identification)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="heading-serif text-xl text-bordeaux-600 dark:text-ivory-200">How we use your data</h2>
          <ul className="list-disc space-y-1 ps-6">
            <li>To authenticate you and maintain your session</li>
            <li>To generate personalized wine recommendations</li>
            <li>To store your cellar, wishlist, and taste profile</li>
            <li>Wine images and search queries are sent to OpenAI for processing and are subject to <a href="https://openai.com/policies/privacy-policy" className="text-bordeaux-400 underline" target="_blank" rel="noopener noreferrer">OpenAI&apos;s Privacy Policy</a></li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="heading-serif text-xl text-bordeaux-600 dark:text-ivory-200">Data storage</h2>
          <p>Your data is stored securely on Supabase (PostgreSQL) with row-level security enabled. Each user can only access their own data.</p>
        </section>

        <section className="space-y-3">
          <h2 className="heading-serif text-xl text-bordeaux-600 dark:text-ivory-200">Third-party services</h2>
          <ul className="list-disc space-y-1 ps-6">
            <li><strong>Supabase</strong> — authentication and database</li>
            <li><strong>OpenAI</strong> — wine identification and recommendations</li>
            <li><strong>Vercel</strong> — hosting and analytics</li>
            <li><strong>Google</strong> — OAuth sign-in (optional)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="heading-serif text-xl text-bordeaux-600 dark:text-ivory-200">Your rights</h2>
          <p>You can request deletion of your account and all associated data at any time by contacting us. You can also export your cellar and wishlist data from the app.</p>
        </section>

        <section className="space-y-3">
          <h2 className="heading-serif text-xl text-bordeaux-600 dark:text-ivory-200">Contact</h2>
          <p>For privacy-related questions, please reach out via the app settings page.</p>
        </section>
      </article>
    </div>
  );
}
