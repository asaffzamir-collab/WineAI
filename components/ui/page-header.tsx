interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="bg-bordeaux-600 px-4 pb-8 pt-8 dark:bg-charcoal-900 dark:border-b dark:border-charcoal-700">
      <div className="mx-auto max-w-lg">
        <h1 className="heading-serif text-2xl text-white">{title}</h1>
        {children}
      </div>
    </header>
  );
}
