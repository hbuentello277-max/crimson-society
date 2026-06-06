type NexusEmptyStateProps = {
  title: string;
  description?: string;
};

export function NexusEmptyState({ title, description }: NexusEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-8 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description ? <p className="mt-2 text-sm text-zinc-500">{description}</p> : null}
    </div>
  );
}
