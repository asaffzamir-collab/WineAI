import { RootGate } from '@/components/root-gate';

export const dynamic = 'force-dynamic';

/** Root: show sign-in if no session, otherwise onboarding or home. */
export default function Page() {
  return <RootGate />;
}
