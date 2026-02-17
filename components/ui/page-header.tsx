interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <header className="mb-6 md:mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-title text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-small text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0">{actions}</div>
        )}
      </div>
      {children}
    </header>
  );
}
