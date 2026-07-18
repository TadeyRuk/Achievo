import { useRef, type ReactNode } from 'react';
import { useFocusTrap } from './useFocusTrap';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible name when no labelled heading is present. */
  'aria-label'?: string;
  /** Id of a visible title element. */
  'aria-labelledby'?: string;
  className?: string;
  /** Extra classes on the scrim. */
  overlayClassName?: string;
};

/**
 * Centered modal with role=dialog, aria-modal, Esc-to-close, and focus trap.
 * Prefer IOSSheet for bottom sheets; use Dialog for centered overlays.
 */
export function Dialog({
  open,
  onClose,
  children,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className = '',
  overlayClassName = '',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00162b]/65 backdrop-blur-md ${overlayClassName}`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={`outline-none ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
