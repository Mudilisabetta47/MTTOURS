export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty" role="status">
      <strong>{title}</strong>
      {children ? <span>{children}</span> : null}
    </div>
  );
}
