import { Loader2 } from 'lucide-react';

export default function CellarLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory-200 dark:bg-charcoal-900">
      <Loader2 className="h-8 w-8 animate-spin text-bordeaux-400" />
    </div>
  );
}
