import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Square } from 'lucide-react';
import { Button, Modal, toast } from '@/components/ui';
import { useSettings } from '@/features/settings/settingsStore';
import { de } from '@/i18n/de';
import { dictationAvailable, startDictation, type Dictation } from '@/services/speech/dictation';

const t = de.conversations;

/**
 * Dictation into the chosen field via the Web Speech API – only if the browser offers it.
 * The first use explains that recognition runs through Apple.
 */
export function DictationButton({
  target,
  onText,
}: {
  /** Label of the field that receives the text. */
  target: string;
  onText: (text: string) => void;
}) {
  const [available] = useState(dictationAvailable);
  const noticeSeen = useSettings((s) => s.dictationNoticeSeen);
  const setSetting = useSettings((s) => s.set);
  const [notice, setNotice] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const session = useRef<Dictation | null>(null);
  // The field may change while listening: the text goes to the field chosen last.
  const deliver = useRef(onText);
  useEffect(() => {
    deliver.current = onText;
  });
  useEffect(() => () => session.current?.stop(), []);

  if (!available) return null;

  const start = () => {
    try {
      session.current = startDictation({
        onFinal: (text) => deliver.current(text),
        onInterim: setInterim,
        onEnd: () => {
          session.current = null;
          setListening(false);
          setInterim('');
        },
        onError: () => toast.error(t.dictationError),
      });
      setListening(true);
    } catch {
      toast.error(t.dictationError);
    }
  };

  const toggle = () => {
    if (listening) {
      session.current?.stop();
      return;
    }
    if (!noticeSeen) setNotice(true);
    else start();
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1" data-testid="dictation">
      <Button
        variant={listening ? 'danger' : 'secondary'}
        size="sm"
        icon={listening ? Square : Mic}
        onClick={toggle}
        aria-pressed={listening}
        data-testid="dictation-button"
      >
        {listening ? t.dictateStop : t.dictate}
      </Button>
      <span className="flex min-w-0 items-center gap-2 text-sm text-fg-secondary">
        {listening && (
          <motion.span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full bg-danger"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        <span className="truncate" data-testid="dictation-target">
          {listening ? `${t.listening} ${t.dictateInto(target)}` : t.dictateInto(target)}
        </span>
      </span>
      {interim && (
        <p
          className="w-full rounded-lg bg-surface-sunken px-3 py-2 text-base text-fg-secondary italic"
          data-testid="dictation-interim"
        >
          {interim}
        </p>
      )}
      <Modal
        open={notice}
        onClose={() => setNotice(false)}
        title={t.dictationNotice.title}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNotice(false)}>
              {t.cancel}
            </Button>
            <Button
              icon={Mic}
              onClick={() => {
                setNotice(false);
                void setSetting('dictationNoticeSeen', true);
                start();
              }}
              data-testid="dictation-notice-confirm"
            >
              {t.dictationNotice.confirm}
            </Button>
          </>
        }
      >
        <p className="text-base text-fg-secondary">{t.dictationNotice.text}</p>
      </Modal>
    </div>
  );
}
