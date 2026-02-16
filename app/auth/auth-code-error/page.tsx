'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCodeError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bordeaux-600 px-4 dark:bg-charcoal-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-xl">
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-stone-500 dark:text-stone-400">
            {errorDescription || error || 'Something went wrong during authentication. Please try again.'}
          </p>
          
          <Link href="/" className="block">
            <Button className="w-full" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
