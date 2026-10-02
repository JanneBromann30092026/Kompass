import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  CalendarClock,
  ListTodo,
  Maximize2,
  MessageSquarePlus,
  MessageSquareQuote,
  Minimize2,
  ShieldQuestion,
  Target,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  cn,
  EmptyState,
  IconButton,
  Surface,
  type BadgeTone,
} from '@/components/ui';
import { useToday } from '@/app/hooks/useToday';
import { Page } from '@/app/shell/Page';
import { useFocusModeRequest } from '@/app/shell/focusMode';
import { buildPreparation } from '@/core/conversations/prepare';
import { ageInfo, daysUntilBirthday } from '@/core/customers/age';
import { formatCalendarDate, formatMoney } from '@/core/format';
import { PRODUCT_LINES, type Priority } from '@/data/domain';
import {
  CONTACT_CHANNEL_LABELS,
  EMPLOYMENT_LABELS,
  HOUSING_LABELS,
  LIFE_PHASE_INFO,
  MARITAL_STATUS_LABELS,
  NEED_TIMING_LABELS,
  POTENTIAL_LABELS,
  PRODUCT_LINE_INFO,
  reasonText,
} from '@/data/reference';
import type { Customer } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { CustomerBadges } from '../customers/components/CustomerBadges';
import { customerName } from '../customers/labels';
import { useCustomerNeeds } from '../needs/useCustomerNeeds';
import { dueLabel } from '../reminders/useReminders';

const t = de.conversations.prep;
const PRIORITY_TONES: Record<Priority, BadgeTone> = { 1: 'amber', 2: 'neutral', 3: 'neutral' };

function Card({
  title,
  icon: Icon,
  children,
  testId,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  testId: string;
  className?: string;
}) {
  return (
    <Surface
      padding="sm"
      className={cn('flex flex-col gap-2.5 p-4', className)}
      data-testid={testId}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
        <Icon size={18} aria-hidden className="shrink-0 text-accent" />
        {title}
      </h2>
      {children}
    </Surface>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-sm text-fg-muted">{text}</p>;

function Profile({ customer, today, last }: { customer: Customer; today: string; last?: string }) {
  const { age, approximate } = ageInfo(customer, today);
  const days = customer.birthDate ? daysUntilBirthday(customer.birthDate, today) : undefined;
  const concluded = PRODUCT_LINES.filter((line) => customer.contracts[line] === 'concluded');
  const family = [
    customer.maritalStatus && MARITAL_STATUS_LABELS[customer.maritalStatus],
    customer.children ? t.children(customer.children) : undefined,
  ].filter(Boolean);
  const job = [
    customer.occupation,
    customer.employment && EMPLOYMENT_LABELS[customer.employment],
  ].filter(Boolean);
  const rows: [string, string | undefined][] = [
    [
      t.age,
      age === undefined
        ? undefined
        : [
            de.customers.file.age(age, approximate),
            days !== undefined && days <= 30 ? de.customers.file.nextBirthday(days) : undefined,
          ]
            .filter(Boolean)
            .join(' · '),
    ],
    [t.phase, customer.lifePhase && LIFE_PHASE_INFO[customer.lifePhase].name],
    [t.job, job.join(' · ') || undefined],
    [t.family, family.join(', ') || undefined],
    [t.housing, customer.housing && HOUSING_LABELS[customer.housing]],
    [t.income, customer.netIncome === undefined ? undefined : formatMoney(customer.netIncome)],
    [
      t.channel,
      customer.consents.contactChannel &&
        CONTACT_CHANNEL_LABELS[customer.consents.contactChannel.channel],
    ],
    [t.potential, customer.potential && POTENTIAL_LABELS[customer.potential]],
    [t.concluded, concluded.map((line) => PRODUCT_LINE_INFO[line].name).join(', ') || undefined],
    [t.last, last ?? t.noLast],
  ];
  return (
    <>
      <CustomerBadges customer={customer} today={today} className="flex flex-wrap gap-1.5" />
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-fg-secondary">{label}</dt>
            <dd
              className={cn(
                'min-w-0 break-words hyphens-auto',
                value ? 'text-fg' : 'text-fg-muted',
              )}
            >
              {value ?? de.customers.file.emptyValue}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function Preparation({ customer }: { customer: Customer }) {
  const navigate = useNavigate();
  const today = useToday();
  const [fullscreen, setFullscreen] = useState(false);
  useFocusModeRequest(fullscreen);
  const reminders = useDataStore((state) => state.reminders);
  const conversations = useDataStore((state) => state.conversations);
  const { views, hooks } = useCustomerNeeds(customer);
  const prep = useMemo(
    () =>
      buildPreparation({
        customer,
        views,
        hooks,
        reminders: Object.values(reminders),
        conversations: Object.values(conversations),
        today,
      }),
    [customer, views, hooks, reminders, conversations, today],
  );
  const last = prep.lastConversation;
  const fileUrl = `/customers/${customer.id}`;

  return (
    <Page
      title={customerName(customer)}
      leading={
        <IconButton
          icon={ArrowLeft}
          label={de.customers.file.back}
          onClick={() => void navigate(fileUrl)}
        />
      }
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            icon={fullscreen ? Minimize2 : Maximize2}
            aria-pressed={fullscreen}
            onClick={() => setFullscreen(!fullscreen)}
            data-testid="prep-fullscreen"
          >
            <span className="hidden sm:inline">{fullscreen ? t.exitFullscreen : t.fullscreen}</span>
          </Button>
          <Button
            size="sm"
            icon={MessageSquarePlus}
            onClick={() => void navigate(`${fileUrl}/conversations/new`)}
            data-testid="prep-record"
          >
            <span className="hidden sm:inline">{de.conversations.record}</span>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3" data-testid="preparation">
        <p className="-mt-2 text-base text-fg-secondary">
          {t.title} · {customer.number}
        </p>
        <div className="grid gap-3 wide:grid-cols-3">
          <div className="flex flex-col gap-3">
            <Card title={t.profile} icon={UserRound} testId="prep-profile">
              <Profile
                customer={customer}
                today={today}
                last={
                  last && [formatCalendarDate(last.date), last.title].filter(Boolean).join(' · ')
                }
              />
            </Card>
            <Card title={t.reminders} icon={CalendarClock} testId="prep-reminders">
              {prep.reminders.length === 0 ? (
                <Empty text={t.noReminders} />
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {prep.reminders.map((reminder) => (
                    <li key={reminder.id} className="flex flex-wrap gap-x-2">
                      <span
                        className={cn(
                          'font-semibold',
                          reminder.dueDate <= today ? 'text-warning' : 'text-fg-secondary',
                        )}
                      >
                        {dueLabel(reminder.dueDate, today)}
                      </span>
                      <span className="text-fg">{reminder.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div className="flex flex-col gap-3">
            <Card title={t.needs} icon={Target} testId="prep-needs">
              {prep.needs.length === 0 ? (
                <Empty text={t.noNeeds} />
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {prep.needs.map((view) => (
                    <li key={view.line} className="flex flex-col gap-0.5" data-testid="prep-need">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-fg">
                          {PRODUCT_LINE_INFO[view.line].name}
                        </span>
                        <Badge tone={PRIORITY_TONES[view.priority]}>
                          {de.needs.priorityOption(view.priority)}
                        </Badge>
                        <span className="text-xs text-fg-muted">
                          {view.group === 'now' ? NEED_TIMING_LABELS.now : NEED_TIMING_LABELS.later}
                        </span>
                      </span>
                      {view.assessment.reasons[0] && (
                        <span className="line-clamp-2 text-sm text-fg-secondary">
                          {reasonText(view.assessment.reasons[0])}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title={t.openPoints} icon={ListTodo} testId="prep-open-points">
              {prep.openPoints.length === 0 ? (
                <Empty text={t.noOpenPoints} />
              ) : (
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-fg">
                  {prep.openPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div className="flex flex-col gap-3">
            <Card title={de.needs.hooks.title} icon={MessageSquareQuote} testId="prep-hooks">
              <ol className="flex flex-col gap-2">
                {prep.hooks.map((hook, index) => (
                  <li
                    key={hook.id}
                    className="flex gap-2 text-base text-fg"
                    data-testid="prep-hook"
                  >
                    <span
                      aria-hidden
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                    >
                      {index + 1}
                    </span>
                    {hook.text}
                  </li>
                ))}
              </ol>
            </Card>
            <Card title={t.objections} icon={ShieldQuestion} testId="prep-objections">
              {prep.objections.length === 0 ? (
                <Empty text={t.noObjections} />
              ) : (
                <dl className="flex flex-col gap-2 text-sm">
                  {prep.objections.flatMap((group) =>
                    group.items.map((item) => (
                      <div key={`${group.line}-${item.objection}`}>
                        <dt className="font-medium text-fg">
                          {PRODUCT_LINE_INFO[group.line].name}: {de.needs.quote(item.objection)}
                        </dt>
                        <dd className="text-fg-secondary">{item.answer}</dd>
                      </div>
                    )),
                  )}
                </dl>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}

/** Everything for the conversation on one screen (/customers/:id/prepare). */
export function PreparationPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const customer = useDataStore((state) => state.customers[id]);
  if (!customer) {
    return (
      <Page title={de.customers.file.notFound}>
        <EmptyState
          title={de.customers.file.notFound}
          text={de.customers.file.notFoundText}
          action={
            <Button onClick={() => void navigate('/customers')}>{de.customers.file.toList}</Button>
          }
        />
      </Page>
    );
  }
  return <Preparation customer={customer} />;
}
