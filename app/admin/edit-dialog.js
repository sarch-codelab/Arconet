"use client";

import { cloneElement, isValidElement, useEffect, useState } from "react";
import { usePresence } from "motion/react";
import { Dialog, Modal, ModalOverlay } from "@animate-ui/react/primitives/react-aria";
import { DialogBackdrop } from "./admin-overlay";
import { useBodyScrollLock, useEscapeKey } from "./use-body-scroll-lock";
import sheet from "./edit-sheet.module.css";

/** Only editing moves into a Sheet. Creation/details keep their existing layout. */
export function EditDialog({ open = true, editing, onDismiss, children, className, label, inline = false, wide = false }) {
  const [present, safeToRemove] = usePresence();
  const [snapshot, setSnapshot] = useState(null);
  const classicOpen = Boolean(open && !editing && present && !inline);
  useBodyScrollLock(classicOpen);
  useEscapeKey(classicOpen, () => onDismiss?.());
  // Retain the last editing content while fields/selection are cleared on close.
  if (open && editing && children !== snapshot) setSnapshot(children);
  useEffect(() => {
    if (present || !safeToRemove) return;
    const timer = setTimeout(safeToRemove, editing ? 450 : 0);
    return () => clearTimeout(timer);
  }, [present, safeToRemove, editing]);
  const child = open && editing ? children : snapshot;
  const content = isValidElement(child) ? cloneElement(child, {
    role: undefined, 'aria-modal': undefined, 'aria-label': undefined,
    'data-drag-scroll': undefined,
    className: `${child.props.className || ""} ${sheet.content}`,
  }) : child;
  return <>
    {open && !editing && present && (inline ? children : <DialogBackdrop className={className} onDismiss={onDismiss}>{children}</DialogBackdrop>)}
    <ModalOverlay isOpen={Boolean(open && editing && present)} isDismissable
      onOpenChange={value => { if (!value) onDismiss?.(); }} className={sheet.overlay} data-admin-overlay="">
      <Modal data-side="right" data-admin-edit-sheet="" className={`${sheet.panel} ${wide ? sheet.wide : ""}`}>
        <Dialog className={sheet.dialog} aria-label={label || child?.props?.['aria-label'] || "Editar"}>
          {content}
        </Dialog>
      </Modal>
    </ModalOverlay>
  </>;
}
