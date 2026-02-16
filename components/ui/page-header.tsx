interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="bg-gradient-to-br from-wine-900 to-wine-800 px-4 pb-8 pt-8">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {children}
      </div>
    </header>
  );
}
