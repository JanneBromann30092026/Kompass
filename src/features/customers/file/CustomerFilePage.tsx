import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Briefcase,
  ClipboardList,
  MessageSquarePlus,
  Contact,
  HandCoins,
  Pencil,
  ShieldCheck,
  Tags,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  ActionMenuButton,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Surface,
  toast,
} from '@/components/ui';
import { useToday } from '@/app/hooks/useToday';
import { Page } from '@/app/shell/Page';
import { ageInfo, daysUntilBirthday, needsParentalConsent } from '@/core/customers/age';
import { localIsoDate } from '@/core/dates';
import { formatCalendarDate, formatMoney } from '@/core/format';
import { ANSWER_KEYS, type AnswerKey } from '@/data/domain';
import { customersRepo } from '@/data/repositories';
import {
  CONTACT_CHANNEL_LABELS,
  EMPLOYMENT_LABELS,
  HOUSING_LABELS,
  LIFE_PHASE_INFO,
  MARITAL_STATUS_LABELS,
  POTENTIAL_LABELS,
  QUESTIONNAIRE,
  RISK_PROFILE_LABELS,
} from '@/data/reference';
import type { Customer } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { ConversationsSection } from '@/features/conversations/ConversationsSection';
import { HooksSection, NeedsSection, useCustomerNeeds } from '@/features/needs';
import { RemindersSection } from '@/features/reminders/RemindersSection';
import { de } from '@/i18n/de';
import { spring } from '@/styles/motion';
import { CustomerAvatar } from '../components/CustomerAvatar';
import { customerName } from '../labels';
import { CustomerBadges } from '../components/CustomerBadges';
import type { FieldKey } from '../fields/fieldKeys';
import { answerLabel } from '../labels';
import { ContactActions } from './ContactActions';
import { ContractsCard } from './ContractsCard';
import { HistoryCard } from './HistoryCard';
import { LifeEventsCard } from './LifeEventsCard';
import { OpenPointsCard } from './OpenPointsCard';
import { DetailList, FileSection } from './parts';
import { SectionEditor, type FieldGroup } from './SectionEditor';

const t = de.customers;
const f = t.fields;
const s = t.file.sections;

type EditorKey = keyof typeof t.file.editTitles;

/** Answer keys grouped by their catalogue section. */
const ANSWER_GROUPS: FieldGroup[] = QUESTIONNAIRE.sections
  .map((section) => ({
    title: section.title,
    fields: section.questions
      .flatMap((q) => q.fields)
      .filter((path) => path.startsWith('answers.')) as FieldKey[],
  }))
  .filter((group) => group.fields.length > 0);

const EDITORS: Record<EditorKey, { groups: FieldGroup[]; description?: string }> = {
  person: {
    groups: [
      { fields: ['firstName', 'lastName', 'birth', 'maritalStatus', 'children', 'housing'] },
    ],
  },
  contact: {
    groups: [{ fields: ['phone', 'email', 'contactChannel'] }],
    description: t.hints.contact,
  },
  situation: {
    groups: [
      {
        fields: [
          'lifePhase',
          'occupation',
          'employment',
          'trainingStart',
          'trainingEnd',
          'employerVl',
          'employerBav',
          'healthCheckDone',
        ],
      },
    ],
  },
  finances: {
    groups: [{ fields: ['netIncome', 'fixedCosts', 'disposableIncome', 'riskProfile'] }],
  },
  consents: { groups: [{ fields: ['dataStorage', 'marketing', 'parentalConsent'] }] },
  answers: { groups: ANSWER_GROUPS, description: t.hints.health },
  more: { groups: [{ fields: ['potential', 'tags'] }] },
};

const yesNo = (value: boolean | undefined) =>
  value === undefined ? undefined : value ? f.yes : f.no;

function consentText(consent: { granted: boolean; date: string } | undefined) {
  if (!consent) return undefined;
  return `${consent.granted ? f.granted : f.refused} · ${formatCalendarDate(consent.date)}`;
}

function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <IconButton
      icon={ArrowLeft}
      label={t.file.back}
      data-testid="file-back"
      onClick={() => {
        if (location.key === 'default') void navigate('/customers', { replace: true });
        else void navigate(-1);
      }}
    />
  );
}

function Hero({
  customer,
  today,
  onEdit,
}: {
  customer: Customer;
  today: string;
  onEdit: () => void;
}) {
  const navigate = useNavigate();
  const { age, approximate } = ageInfo(customer, today);
  const birth = customer.birthDate
    ? t.file.birthday(formatCalendarDate(customer.birthDate))
    : customer.birthYear
      ? t.file.birthYear(customer.birthYear)
      : undefined;
  const days = customer.birthDate ? daysUntilBirthday(customer.birthDate, today) : undefined;
  const facts = [
    age === undefined ? undefined : t.file.age(age, approximate),
    birth,
    days !== undefined && days <= 30 ? t.file.nextBirthday(days) : undefined,
  ].filter(Boolean);
  return (
    <Surface padding="lg" className="relative overflow-hidden" data-testid="file-hero">
      <div aria-hidden className="knowledge-glow pointer-events-none absolute -inset-10" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <CustomerAvatar firstName={customer.firstName} lastName={customer.lastName} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent" className="tabular-nums">
                {customer.number}
              </Badge>
              <CustomerBadges customer={customer} today={today} className="contents" />
            </div>
            {facts.length > 0 && (
              <p className="text-base text-fg" data-testid="file-age">
                {facts.join(' · ')}
              </p>
            )}
            <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-fg-secondary">
              {customer.lifePhase && (
                <Link
                  to={`/knowledge/phase/${customer.lifePhase}`}
                  className="focus-ring rounded font-medium text-accent"
                >
                  {LIFE_PHASE_INFO[customer.lifePhase].name}
                </Link>
              )}
              {customer.lifePhase && customer.occupation && <span aria-hidden>·</span>}
              {customer.occupation && <span>{customer.occupation}</span>}
              {(customer.lifePhase || customer.occupation) && <span aria-hidden>·</span>}
              <span>
                {t.file.since(formatCalendarDate(localIsoDate(new Date(customer.createdAt))))}
              </span>
            </p>
          </div>
          <IconButton
            icon={Pencil}
            label={t.file.editTitles.person}
            variant="secondary"
            onClick={onEdit}
            data-testid="edit-person"
          />
        </div>
        <ContactActions customer={customer} />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={ClipboardList}
            onClick={() => void navigate(`/customers/${customer.id}/prepare`)}
            data-testid="hero-prepare"
          >
            {de.conversations.prep.title}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={MessageSquarePlus}
            onClick={() => void navigate(`/customers/${customer.id}/conversations/new`)}
            data-testid="hero-record"
          >
            {de.conversations.record}
          </Button>
        </div>
      </div>
    </Surface>
  );
}

function FileContent({ customer }: { customer: Customer }) {
  const today = useToday();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<EditorKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const edit = (key: EditorKey) => () => setEditing(key);
  const showParents = needsParentalConsent(customer, today) || customer.parentalConsent;
  const answers = ANSWER_KEYS.filter((key) => customer.answers[key]);
  const { views, hooks } = useCustomerNeeds(customer);

  const toggleArchive = async () => {
    const next = !customer.archived;
    await customersRepo.setArchived(customer.id, next);
    toast.success(next ? t.file.archived(customer.number) : t.file.unarchived(customer.number));
  };

  return (
    <Page
      title={customerName(customer)}
      leading={<BackButton />}
      actions={
        <ActionMenuButton
          label={t.file.actions}
          items={[
            {
              id: 'archive',
              label: customer.archived ? t.file.unarchive : t.file.archive,
              icon: customer.archived ? ArchiveRestore : Archive,
              onSelect: () => void toggleArchive(),
            },
            {
              id: 'delete',
              label: t.file.delete,
              icon: Trash2,
              danger: true,
              onSelect: () => setDeleting(true),
            },
          ]}
        />
      }
    >
      <motion.div
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.soft}
        data-testid="customer-file"
      >
        {customer.archived && (
          <div
            className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-sunken px-5 py-3"
            data-testid="archived-banner"
          >
            <Archive size={18} aria-hidden className="text-fg-muted" />
            <span className="flex-1 text-base text-fg-secondary">{t.file.archivedBanner}</span>
            <Button
              variant="secondary"
              size="sm"
              icon={ArchiveRestore}
              onClick={() => void toggleArchive()}
            >
              {t.file.unarchive}
            </Button>
          </div>
        )}

        <Hero customer={customer} today={today} onEdit={edit('person')} />
        <RemindersSection customer={customer} today={today} />
        <ContractsCard customer={customer} />
        <NeedsSection customer={customer} views={views} />
        <HooksSection hooks={hooks} />

        <div className="grid gap-4 wide:grid-cols-2">
          <FileSection
            title={s.profile}
            icon={UserRound}
            onEdit={edit('person')}
            testId="file-person"
          >
            <DetailList
              items={[
                { label: f.firstName, value: customer.firstName },
                { label: f.lastName, value: customer.lastName },
                {
                  label: customer.birthDate || !customer.birthYear ? f.birthDate : f.birthYear,
                  value: customer.birthDate
                    ? formatCalendarDate(customer.birthDate)
                    : customer.birthYear?.toString(),
                },
                {
                  label: f.maritalStatus,
                  value: customer.maritalStatus && MARITAL_STATUS_LABELS[customer.maritalStatus],
                },
                { label: f.children, value: customer.children?.toString() },
                { label: f.housing, value: customer.housing && HOUSING_LABELS[customer.housing] },
              ]}
            />
          </FileSection>

          <FileSection
            title={s.contact}
            icon={Contact}
            onEdit={edit('contact')}
            testId="file-contact"
          >
            <DetailList
              items={[
                { label: f.phone, value: customer.phone },
                { label: f.email, value: customer.email },
                {
                  label: f.contactChannel,
                  value:
                    customer.consents.contactChannel &&
                    CONTACT_CHANNEL_LABELS[customer.consents.contactChannel.channel],
                },
              ]}
            />
            {!customer.phone && !customer.email && (
              <p className="text-sm text-fg-muted">{t.hints.contact}</p>
            )}
          </FileSection>

          <FileSection
            title={s.situation}
            icon={Briefcase}
            onEdit={edit('situation')}
            testId="file-situation"
          >
            <DetailList
              items={[
                {
                  label: f.lifePhase,
                  value: customer.lifePhase && LIFE_PHASE_INFO[customer.lifePhase].name,
                },
                { label: f.occupation, value: customer.occupation },
                {
                  label: f.employment,
                  value: customer.employment && EMPLOYMENT_LABELS[customer.employment],
                },
                {
                  label: f.trainingStart,
                  value: customer.trainingStart && formatCalendarDate(customer.trainingStart),
                },
                {
                  label: f.trainingEnd,
                  value: customer.trainingEnd && formatCalendarDate(customer.trainingEnd),
                },
                { label: f.employerVl, value: yesNo(customer.employerVl) },
                { label: f.employerBav, value: yesNo(customer.employerBav) },
                { label: f.healthCheckDone, value: yesNo(customer.healthCheckDone) },
              ]}
            />
          </FileSection>

          <FileSection
            title={s.finances}
            icon={HandCoins}
            onEdit={edit('finances')}
            testId="file-finances"
          >
            <DetailList
              items={[
                {
                  label: f.netIncome,
                  value:
                    customer.netIncome === undefined ? undefined : formatMoney(customer.netIncome),
                },
                {
                  label: f.fixedCosts,
                  value:
                    customer.fixedCosts === undefined
                      ? undefined
                      : formatMoney(customer.fixedCosts),
                },
                {
                  label: f.disposableIncome,
                  value:
                    customer.disposableIncome === undefined
                      ? undefined
                      : formatMoney(customer.disposableIncome),
                },
                {
                  label: f.riskProfile,
                  value: customer.riskProfile && RISK_PROFILE_LABELS[customer.riskProfile],
                },
              ]}
            />
          </FileSection>

          <FileSection
            title={s.consents}
            icon={ShieldCheck}
            onEdit={edit('consents')}
            testId="file-consents"
          >
            <DetailList
              items={[
                { label: f.dataStorage, value: consentText(customer.consents.dataStorage) },
                { label: f.marketing, value: consentText(customer.consents.marketing) },
                ...(showParents
                  ? [{ label: f.parentalConsent, value: consentText(customer.parentalConsent) }]
                  : []),
              ]}
            />
          </FileSection>

          <OpenPointsCard customer={customer} />
          <LifeEventsCard customerId={customer.id} />

          <FileSection title={s.more} icon={Tags} onEdit={edit('more')} testId="file-more">
            <DetailList
              items={[
                {
                  label: f.potential,
                  value: customer.potential && POTENTIAL_LABELS[customer.potential],
                },
                { label: f.tags, value: customer.tags.join(', ') },
              ]}
            />
          </FileSection>
        </div>

        <FileSection
          title={s.answers}
          icon={ClipboardList}
          onEdit={edit('answers')}
          testId="file-answers"
        >
          {answers.length === 0 ? (
            <p className="text-base text-fg-muted">{t.file.noAnswers}</p>
          ) : (
            <DetailList
              items={answers.map((key: AnswerKey) => ({
                label: answerLabel(key),
                value: customer.answers[key],
              }))}
            />
          )}
        </FileSection>

        <ConversationsSection customerId={customer.id} />

        <HistoryCard customerId={customer.id} />
      </motion.div>

      {editing && (
        <SectionEditor
          customer={customer}
          title={t.file.editTitles[editing]}
          description={EDITORS[editing].description}
          groups={EDITORS[editing].groups}
          today={today}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          const number = customer.number;
          await navigate('/customers', { replace: true });
          await customersRepo.remove(customer.id);
          toast.success(t.file.deleted(number));
        }}
        title={t.file.deleteTitle(customerName(customer))}
        message={t.file.deleteText}
        confirmLabel={t.file.deleteConfirm}
      />
    </Page>
  );
}

/** The customer file: all facts, quick actions, contracts, consents and history. */
export function CustomerFilePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const customer = useDataStore((state) => state.customers[id]);
  if (!customer) {
    return (
      <Page title={t.file.notFound} leading={<BackButton />}>
        <EmptyState
          title={t.file.notFound}
          text={t.file.notFoundText}
          action={<Button onClick={() => void navigate('/customers')}>{t.file.toList}</Button>}
        />
      </Page>
    );
  }
  return <FileContent customer={customer} />;
}
