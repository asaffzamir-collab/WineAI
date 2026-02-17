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
      className={cn('animate-page py-6 md:py-8 lg:py-10', className)}
      {...props}
    >
      <Container size={size}>
        {children}
      </Container>
    </div>
  );
}
