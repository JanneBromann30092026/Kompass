import { useState } from 'react';
import { Button, toast } from '@/components/ui';
import { customersRepo } from '@/data/repositories';
import type { Customer } from '@/data/schemas';
import { de } from '@/i18n/de';
import { EditPanel } from '../components/EditPanel';
import { CustomerField } from '../fields/CustomerField';
import type { FieldErrors, FieldKey, FormValues } from '../fields/fieldKeys';
import { errorsOf, formErrors, initialValues, showsParentalConsent } from '../fields/formValues';

const t = de.customers;

export interface FieldGroup {
  title?: string;
  fields: readonly FieldKey[];
}

interface SectionEditorProps {
  customer: Customer;
  title: string;
  description?: string;
  groups: readonly FieldGroup[];
  today: string;
  onClose: () => void;
}

/** Edits one section of the customer file in a panel; saves through the repository. */
export function SectionEditor({
  customer,
  title,
  description,
  groups,
  today,
  onClose,
}: SectionEditorProps) {
  const fields = groups.flatMap((group) => group.fields);
  const [values, setValues] = useState<FormValues>(() => initialValues(customer, fields));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const merged = { ...customer, ...values };

  const change = (patch: FormValues) => {
    setValues((current) => ({ ...current, ...patch }));
    setErrors({});
  };

  const save = async () => {
    const problems = formErrors(merged, today);
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }
    setSaving(true);
    try {
      await customersRepo.update(customer.id, values);
      toast.success(t.file.saved);
      onClose();
    } catch (error: unknown) {
      const fieldErrors = errorsOf(error);
      if (fieldErrors) setErrors(fieldErrors);
      else toast.error(t.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const visible = (field: FieldKey) =>
    field !== 'parentalConsent' || showsParentalConsent(merged, today);

  return (
    <EditPanel
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.file.cancel}
          </Button>
          <Button onClick={() => void save()} loading={saving} data-testid="section-save">
            {t.file.save}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-6 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        data-testid="section-editor"
      >
        {groups.map((group, index) => (
          <div key={group.title ?? index} className="flex flex-col gap-4">
            {group.title && (
              <h3 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
                {group.title}
              </h3>
            )}
            {group.fields.filter(visible).map((field) => (
              <CustomerField
                key={field}
                field={field}
                values={merged}
                onChange={change}
                error={errors[field]}
                today={today}
              />
            ))}
          </div>
        ))}
        {/* Enter in a text field saves (hardware keyboard). */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </EditPanel>
  );
}
