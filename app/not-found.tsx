import Link from 'next/link';
import { Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 bg-background">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2">
        <Wine className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h2 className="text-title text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
