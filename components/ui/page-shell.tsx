import { cn } from '@/lib/utils';
import { Container } from './container';

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'narrow' | 'default' | 'wide' | 'full';
}

export function PageShell({
  className,
  size = 'default',
  children,
  ...props
}: PageShellProps) {
  return (
    <div
      className={cn('animate-page pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.75rem))] pb-6 md:pt-8 md:pb-8 lg:pt-10 lg:pb-10', className)}
      {...props}
    >
      <Container size={size}>
        {children}
      </Container>
    </div>
  );
}
