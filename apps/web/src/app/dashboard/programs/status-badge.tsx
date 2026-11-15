const styles: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  completed: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  archived: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const labels: Record<string, string> = {
  draft: 'Draft · athlete can’t see it',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status] ?? styles.completed}`}>
      {labels[status] ?? status}
    </span>
  );
}
