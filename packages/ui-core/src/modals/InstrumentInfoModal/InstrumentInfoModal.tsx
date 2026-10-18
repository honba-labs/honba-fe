// Batch G (docs/tasks.md): ported from bfx-hf-ui-core's `CcyInfoModal`
// (src/modals/CcyInfoModal/*, Apache-2.0) → renamed `InstrumentInfoModal` (honba shows an
// instrument article, not a Bitfinex CCY page). The reference fetched the article itself
// (`fetchCcyArticle` redux action) and hacked the embedded coingecko widget's theme; honba's
// article comes in as props (Batch H wires `GET /instruments/{id}/info` — or whatever the
// honba API settles on), and third-party widget theming is dropped.
//
// Rendering contract: `article.body` is trusted HTML (the reference rendered it through
// `dangerously-set-html-content`; we use React's `dangerouslySetInnerHTML` directly). Callers
// must only pass server-sourced article HTML for the instrument — same trust level as the
// reference had. Link target/rel hardening is kept from the reference: anchors injected via
// dangerouslySetInnerHTML can't get React hydration fixes, so a small effect post-processes
// the rendered article.
import { useEffect, useRef } from 'react';

import { Indicator } from '../../ui/Indicator';
import { Modal } from '../../ui/Modal';
import './InstrumentInfoModal.css';

export interface InstrumentInfoArticle {
  title?: string;
  /** The article HTML; `null` while it hasn't been fetched yet. */
  body: string | null;
}

export interface InstrumentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: InstrumentInfoArticle | null;
  className?: string;
}

export function InstrumentInfoModal({
  isOpen,
  onClose,
  article,
  className,
}: InstrumentInfoModalProps) {
  // Ref to the article container for the reference's link hardening pass (fires after each
  // body render — the effect depends on the body string, not the ref identity).
  const articleRef = useRef<HTMLDivElement>(null);
  const body = article?.body ?? null;

  useEffect(() => {
    if (!body || !articleRef.current) return;
    const anchors = articleRef.current.querySelectorAll('a');
    anchors.forEach((link) => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  }, [body]);

  return (
    <Modal
      label={article?.title || 'Instrument info'}
      isOpen={isOpen}
      onClose={onClose}
      scrollable
      width={980}
      className={`hb-instrument-info-modal ${className ?? ''}`}
    >
      <div ref={articleRef} className="hb-instrument-info-modal__article">
        {body === null || body === '' || article === null ? (
          <p className="hb-instrument-info-modal__loading">
            <Indicator color="grey" blinking /> Loading article…
          </p>
        ) : (
          // Trust contract documented above — server-sourced article HTML only.
          <div dangerouslySetInnerHTML={{ __html: body }} />
        )}
      </div>
    </Modal>
  );
}
