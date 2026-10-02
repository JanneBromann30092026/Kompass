import { Copy, MessageSquareQuote } from 'lucide-react';
import { Badge, Button, IconButton, toast } from '@/components/ui';
import type { Hook } from '@/core/needs/hooks';
import { PRODUCT_LINE_INFO } from '@/data/reference';
import { de } from '@/i18n/de';
import { FileSection } from '../customers/file/parts';

const t = de.needs.hooks;

async function copy(text: string, success: string) {
  try {
    if (!navigator.clipboard) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    toast.success(success);
  } catch {
    toast.error(t.copyFailed);
  }
}

/** The 3–5 best conversation openers for this customer, each copyable. */
export function HooksSection({ hooks }: { hooks: Hook[] }) {
  return (
    <FileSection
      title={t.title}
      icon={MessageSquareQuote}
      testId="file-hooks"
      actions={
        <Button
          size="sm"
          variant="secondary"
          icon={Copy}
          onClick={() =>
            void copy(hooks.map((hook) => hook.text).join('\n\n'), t.copiedAll(hooks.length))
          }
          data-testid="hooks-copy-all"
        >
          {t.copyAll}
        </Button>
      }
    >
      <p className="text-sm text-fg-secondary">{t.hint}</p>
      <ol className="flex flex-col gap-2">
        {hooks.map((hook, index) => (
          <li
            key={hook.id}
            className="flex items-start gap-3 rounded-xl border border-line bg-surface-sunken py-2 pr-2 pl-3"
            data-testid="hook-item"
          >
            <span
              aria-hidden
              className="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent tabular-nums"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 py-1.5">
              <p className="text-base text-fg" data-testid="hook-text">
                {hook.text}
              </p>
              {hook.line && (
                <Badge className="self-start">{PRODUCT_LINE_INFO[hook.line].name}</Badge>
              )}
            </div>
            <IconButton
              icon={Copy}
              label={t.copy}
              onClick={() => void copy(hook.text, t.copied)}
              data-testid="hook-copy"
            />
          </li>
        ))}
      </ol>
    </FileSection>
  );
}
