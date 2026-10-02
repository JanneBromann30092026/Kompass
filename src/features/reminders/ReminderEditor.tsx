import { useMemo, useState } from 'react';
import { Button, Input, Select, Textarea, toast } from '@/components/ui';
import { reminderActionsRepo } from '@/data/repositories';
import { LIMITS, type Reminder } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { EditPanel } from '../customers/components/EditPanel';
import { customerName } from '../customers/labels';

const t = de.reminders;

/** New manual reminder (optionally with customer choice) or editing an existing one. */
export function ReminderEditor({
  reminder,
  customerId,
  today,
  onClose,
}: {
  reminder?: Reminder;
  /** Fixed customer (customer file); without it the customer is chosen. */
  customerId?: string;
  today: string;
  onClose: () => void;
}) {
  const customers = useDataStore((state) => state.customers);
  const options = useMemo(
    () =>
      Object.values(customers)
        .filter((customer) => !customer.archived)
        .sort((a, b) => a.number.localeCompare(b.number))
        .map((customer) => ({
          value: customer.id,
          label: `${customer.number} · ${customerName(customer)}`,
        })),
    [customers],
  );
  const [customer, setCustomer] = useState(reminder?.customerId ?? customerId ?? '');
  const [dueDate, setDueDate] = useState(reminder?.dueDate ?? today);
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [todo, setTodo] = useState(reminder?.todo ?? '');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const missing = {
    customer: customer === '',
    dueDate: dueDate === '',
    title: title.trim() === '',
  };
  const valid = !missing.customer && !missing.dueDate && !missing.title;

  const save = async () => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    try {
      const input = { dueDate, title: title.trim(), todo: todo.trim() || undefined };
      if (reminder) await reminderActionsRepo.edit(reminder.id, input);
      else await reminderActionsRepo.createManual(customer, input);
      toast.success(t.toastSaved);
      onClose();
    } catch {
      toast.error(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditPanel
      open
      onClose={onClose}
      title={reminder ? t.editTitle : t.add}
      description={reminder?.ruleKey ? t.automaticHint : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button onClick={() => void save()} loading={saving} data-testid="reminder-save">
            {t.save}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5" data-testid="reminder-editor">
        {!reminder && !customerId && (
          <Select
            label={t.customer}
            value={customer}
            onChange={setCustomer}
            options={[{ value: '', label: t.chooseCustomer }, ...options]}
            error={touched && missing.customer ? t.required : undefined}
            data-testid="reminder-customer"
          />
        )}
        <Input
          type="date"
          label={t.dueDate}
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          error={touched && missing.dueDate ? t.required : undefined}
          data-testid="reminder-date"
        />
        <Input
          label={t.titleField}
          placeholder={t.titlePlaceholder}
          value={title}
          maxLength={LIMITS.title}
          onChange={(event) => setTitle(event.target.value)}
          error={touched && missing.title ? t.required : undefined}
          data-testid="reminder-title-input"
        />
        <Textarea
          label={t.todo}
          hint={de.customers.hints.health}
          value={todo}
          maxLength={LIMITS.text}
          onChange={(event) => setTodo(event.target.value)}
          data-testid="reminder-todo"
        />
      </div>
    </EditPanel>
  );
}
