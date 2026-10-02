import { Mail, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import { cn } from '@/components/ui';
import { mailtoHref, telHref, whatsappHref } from '@/core/customers/phone';
import type { ContactChannel } from '@/data/domain';
import type { Customer } from '@/data/schemas';
import { de } from '@/i18n/de';

const t = de.customers.file;

function ActionLink({
  href,
  icon: Icon,
  label,
  preferred,
  external,
  testId,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  preferred: boolean;
  external?: boolean;
  testId: string;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      data-testid={testId}
      data-preferred={preferred || undefined}
      className={cn(
        'focus-ring no-callout inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-base font-medium transition-[transform,background-color] duration-150 active:scale-[0.97]',
        preferred
          ? 'bg-accent text-on-accent shadow-[0_8px_24px_-10px_var(--accent-glow)]'
          : 'border border-line bg-surface-raised text-fg shadow-soft hover:border-line-strong',
      )}
    >
      <Icon size={18} aria-hidden />
      {label}
      {preferred && (
        <span className="rounded-full bg-on-accent/15 px-2 py-0.5 text-xs font-semibold">
          {t.preferred}
        </span>
      )}
    </a>
  );
}

/** Call, WhatsApp and e-mail straight from the file – only for stored contact data. */
export function ContactActions({ customer }: { customer: Customer }) {
  const preferred: ContactChannel | undefined = customer.consents.contactChannel?.channel;
  const whatsapp = customer.phone ? whatsappHref(customer.phone) : null;
  if (!customer.phone && !customer.email) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="contact-actions">
      {customer.phone && (
        <ActionLink
          href={telHref(customer.phone)}
          icon={Phone}
          label={t.call}
          preferred={preferred === 'phone'}
          testId="contact-call"
        />
      )}
      {whatsapp && (
        <ActionLink
          href={whatsapp}
          icon={MessageCircle}
          label={t.whatsapp}
          preferred={preferred === 'whatsapp'}
          external
          testId="contact-whatsapp"
        />
      )}
      {customer.email && (
        <ActionLink
          href={mailtoHref(customer.email)}
          icon={Mail}
          label={t.email}
          preferred={preferred === 'email'}
          testId="contact-email"
        />
      )}
    </div>
  );
}
