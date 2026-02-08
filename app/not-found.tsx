import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-xl font-semibold text-wine-900">Page not found</h2>
      <Link href="/" className="text-wine-600 underline">
        Go home
      </Link>
    </div>
  );
}
