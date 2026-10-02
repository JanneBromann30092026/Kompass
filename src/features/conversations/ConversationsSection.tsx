import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ClipboardList,
  MessageSquarePlus,
  MessagesSquare,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button, cn, ConfirmDialog, toast } from '@/components/ui';
import { formatCalendarDate } from '@/core/format';
import { conversationsRepo } from '@/data/repositories';
import type { Conversation } from '@/data/schemas';
import { useDataStore } from '@/data/store';
import { de } from '@/i18n/de';
import { spring } from '@/styles/motion';
import { FileSection } from '../customers/file/parts';
import { TEXT_FIELDS } from './fields';

const t = de.conversations;

function Entry({ conversation }: { conversation: Conversation }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const title = conversation.title ?? t.untitled;
  const sections = [
    ...TEXT_FIELDS.map((field) => [t.fields[field], conversation[field]] as const),
    [t.fields.notes, conversation.notes] as const,
  ].filter(([, text]) => text);
  return (
    <li
      className="rounded-xl border border-line bg-surface-sunken"
      data-testid="conversation-entry"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={t.expand(title)}
        onClick={() => setOpen(!open)}
        className="focus-ring no-callout flex min-h-14 w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-semibold text-fg">{title}</span>
          <span className="truncate text-sm text-fg-secondary">
            {[formatCalendarDate(conversation.date), conversation.participants]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={cn('shrink-0 text-fg-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.default}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 px-4 pb-3" data-testid="conversation-details">
              <dl className="flex flex-col gap-2.5">
                {sections.map(([label, text]) => (
                  <div key={label}>
                    <dt className="text-sm font-medium text-fg-secondary">{label}</dt>
                    <dd className="text-base whitespace-pre-line text-fg">{text}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Pencil}
                  onClick={() =>
                    void navigate(
                      `/customers/${conversation.customerId}/conversations/${conversation.id}`,
                    )
                  }
                  data-testid="conversation-edit"
                >
                  {t.edit}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => setDeleting(true)}
                  data-testid="conversation-delete"
                >
                  {t.delete}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          await conversationsRepo.remove(conversation.id);
          toast.success(t.toastDeleted);
        }}
        title={t.deleteTitle}
        message={t.deleteText}
        confirmLabel={t.delete}
        variant="danger"
      />
    </li>
  );
}

/** Conversations of the customer, newest first; preparation and new note. */
export function ConversationsSection({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const all = useDataStore((state) => state.conversations);
  const conversations = useMemo(
    () =>
      Object.values(all)
        .filter((conversation) => conversation.customerId === customerId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [all, customerId],
  );
  return (
    <FileSection
      title={t.section}
      icon={MessagesSquare}
      testId="file-conversations"
      actions={
        <>
          <Button
            size="sm"
            variant="secondary"
            icon={ClipboardList}
            onClick={() => void navigate(`/customers/${customerId}/prepare`)}
            data-testid="conversation-prepare"
          >
            <span className="hidden sm:inline">{t.prepare}</span>
          </Button>
          <Button
            size="sm"
            icon={MessageSquarePlus}
            onClick={() => void navigate(`/customers/${customerId}/conversations/new`)}
            data-testid="conversation-new"
          >
            <span className="hidden sm:inline">{t.record}</span>
          </Button>
        </>
      }
    >
      {conversations.length === 0 ? (
        <p className="text-base text-fg-muted">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((conversation) => (
            <Entry key={conversation.id} conversation={conversation} />
          ))}
        </ul>
      )}
    </FileSection>
  );
}
