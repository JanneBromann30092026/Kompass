import { useState } from 'react';
import { Copy, Mail, MessageCircle, type LucideIcon } from 'lucide-react';
import { Button, Modal, SegmentedControl, Textarea, toast } from '@/components/ui';
import { mailtoHref, whatsappHref } from '@/core/customers/phone';
import {
  BIRTHDAY_GREETINGS,
  fillGreeting,
  GREETING_FORMS,
  type GreetingForm,
} from '@/data/reference';
import { LIMITS, type Customer } from '@/data/schemas';
import { de } from '@/i18n/de';
import { customerName } from '../customers/labels';

const t = de.dashboard.greetingDialog;

function LinkButton({
  href,
  icon: Icon,
  label,
  external,
  testId,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  external?: boolean;
  testId: string;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      data-testid={testId}
      className="focus-ring no-callout inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-base font-medium text-on-accent shadow-[0_8px_24px_-10px_var(--accent-glow)] transition-transform duration-150 active:scale-[0.97]"
    >
      <Icon size={18} aria-hidden />
      {label}
    </a>
  );
}

/**
 * Birthday greeting from a template (du/Sie), editable, then sent via WhatsApp or e-mail –
 * only shown for customers with marketing consent (greetings count as marketing).
 */
export function GreetingDialog({
  customer,
  open,
  onClose,
}: {
  customer: Customer;
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<GreetingForm>('du');
  const [text, setText] = useState(() => fillGreeting(BIRTHDAY_GREETINGS.du.text, customer));
  const whatsapp = customer.phone ? whatsappHref(customer.phone, text) : null;
  const email = customer.email
    ? mailtoHref(customer.email, { subject: BIRTHDAY_GREETINGS[form].subject, body: text })
    : null;

  const choose = (next: GreetingForm) => {
    setForm(next);
    setText(fillGreeting(BIRTHDAY_GREETINGS[next].text, customer));
  };

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.title(customerName(customer))}
      footer={
        <>
          <Button
            variant="ghost"
            icon={Copy}
            onClick={() => void copy()}
            data-testid="greeting-copy"
          >
            {t.copy}
          </Button>
          {email && <LinkButton href={email} icon={Mail} label={t.email} testId="greeting-email" />}
          {whatsapp && (
            <LinkButton
              href={whatsapp}
              icon={MessageCircle}
              label={t.whatsapp}
              external
              testId="greeting-whatsapp"
            />
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4" data-testid="greeting-dialog">
        <SegmentedControl
          label={t.form}
          options={GREETING_FORMS.map((value) => ({ value, label: t.forms[value] }))}
          value={form}
          onChange={choose}
        />
        <Textarea
          label={t.text}
          value={text}
          rows={7}
          maxLength={LIMITS.text}
          onChange={(event) => setText(event.target.value)}
          data-testid="greeting-text"
        />
        <p className="text-sm text-fg-secondary">{whatsapp || email ? t.hint : t.noChannel}</p>
      </div>
    </Modal>
  );
}
