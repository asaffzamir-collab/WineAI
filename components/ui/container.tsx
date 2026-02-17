import { cn } from '@/lib/utils';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use 'narrow' for forms, 'default' for pages, 'wide' for dashboards */
  size?: 'narrow' | 'default' | 'wide' | 'full';
}

export function Container({
  className,
  size = 'default',
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        {
          'max-w-lg': size === 'narrow',
          'max-w-5xl': size === 'default',
          'max-w-7xl': size === 'wide',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
