import { cn } from '@/components/ui';

/** Circle with the initials; no photo (keeps personal data minimal). */
export function CustomerAvatar({
  firstName,
  lastName,
  size = 'md',
}: {
  firstName: string;
  lastName?: string;
  size?: 'md' | 'lg';
}) {
  const initials = `${firstName.charAt(0)}${lastName?.charAt(0) ?? ''}`.toLocaleUpperCase('de-DE');
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent',
        size === 'md' ? 'size-11 text-base' : 'size-16 text-xl',
      )}
    >
      {initials}
    </span>
  );
}
