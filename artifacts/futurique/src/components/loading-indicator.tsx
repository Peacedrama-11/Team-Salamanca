import { Spinner } from './ui/spinner';

export function LoadingIndicator({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`loading-indicator${compact ? ' compact' : ''}`} role="status" aria-live="polite">
      <Spinner aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
