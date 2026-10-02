import { Badge } from '@/components/ui';
import type { Customer } from '@/data/schemas';
import { customerBadges } from './badges';

export function CustomerBadges({
  customer,
  today,
  className,
}: {
  customer: Customer;
  today: string;
  className?: string;
}) {
  const badges = customerBadges(customer, today);
  if (badges.length === 0) return null;
  return (
    <span className={className}>
      {badges.map((badge) => (
        <Badge key={badge.key} tone={badge.tone} className="h-6 px-2.5">
          {badge.label}
        </Badge>
      ))}
    </span>
  );
}
