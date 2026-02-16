import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 bg-ivory-200 dark:bg-charcoal-900">
      <h2 className="heading-serif text-xl text-bordeaux-600 dark:text-ivory-200">Page not found</h2>
      <Link href="/" className="text-bordeaux-400 hover:text-bordeaux-600 underline transition-colors dark:text-bordeaux-300">
        Go home
      </Link>
    </div>
  );
}
