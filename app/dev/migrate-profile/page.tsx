'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Copy, ExternalLink } from 'lucide-react';

const MIGRATION_SQL = `ALTER TABLE taste_profiles DROP CONSTRAINT IF EXISTS taste_profiles_user_id_fkey;
ALTER TABLE wine_tastings DROP CONSTRAINT IF EXISTS wine_tastings_user_id_fkey;`;

const SUPABASE_SQL_EDITOR_URL = 'https://supabase.com/dashboard/project/qojtkhdjcbenvnjszcvb/sql/new';

export default function MigrateProfilePage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(MIGRATION_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-cream-50 p-6">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Run profile migration (one-time)</CardTitle>
            <p className="text-sm text-gray-600">
              This fixes &quot;Add to profile&quot; when using the test user. Run the SQL below in Supabase.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                {copied ? <Check className="me-2 h-4 w-4 text-green-600" /> : <Copy className="me-2 h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy SQL'}
              </Button>
              <Button asChild className="flex-1">
                <a href={SUPABASE_SQL_EDITOR_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="me-2 h-4 w-4" />
                  Open SQL Editor
                </a>
              </Button>
            </div>
            <pre className="rounded-lg bg-gray-900 p-4 text-sm text-gray-100 overflow-x-auto">
              {MIGRATION_SQL}
            </pre>
            <p className="text-sm text-gray-500">
              1. Click &quot;Open SQL Editor&quot; → 2. Paste (Cmd+V) → 3. Click &quot;Run&quot;
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
