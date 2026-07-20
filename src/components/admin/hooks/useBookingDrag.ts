"use client";

import { useRef, useState } from "react";

export type DragMode = "move" | "resize";

export type DragGhost = {
  court: string;
  startSlot: number;
  duration: number;
  invalid: boolean;
};

export type DragState = {
  bookingId: string;
  mode: DragMode;
  ghost: DragGhost | null;
  /** Posizione corrente del puntatore (per l'anteprima fluttuante durante il move). */
  pointer: { x: number; y: number } | null;
  /** Dimensioni del blocco e offset del punto afferrato, per l'anteprima a grandezza piena. */
  preview: { width: number; height: number; offsetX: number; offsetY: number } | null;
} | null;

export type DragTarget = { court: string; startSlot: number; duration: number };

type StartDragOptions = {
  bookingId: string;
  court: string;
  startSlot: number;
  duration: number;
  mode: DragMode;
};

type SlotTarget = { court: string; slotIndex: number };

const DRAG_THRESHOLD = 5; // px prima di considerare l'interazione un drag (non un click)

/**
 * Legge lo slot (campo + indice mezz'ora) sotto il puntatore usando gli
 * attributi data-* delle celle cliccabili della timeline. Indipendente dal
 * layout (assi normali o swap): basta che le celle espongano gli attributi.
 */
function readSlotAtPoint(x: number, y: number): SlotTarget | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const cell = el?.closest<HTMLElement>("[data-slot-cell]") ?? null;
  if (!cell) return null;
  const court = cell.getAttribute("data-court");
  const idx = cell.getAttribute("data-slot-index");
  if (court == null || idx == null) return null;
  const slotIndex = Number.parseInt(idx, 10);
  if (Number.isNaN(slotIndex)) return null;
  return { court, slotIndex };
}

type UseBookingDragParams = {
  enabled: boolean;
  halfSlotsPerDay: number;
  /** Vero se il range [startSlot, startSlot+duration) sul campo è libero (escluso excludeId). */
  isRangeFree: (court: string, startSlot: number, duration: number, excludeId: string) => boolean;
  /** Chiamata al rilascio su una destinazione valida e diversa dall'origine. */
  onCommit: (bookingId: string, target: DragTarget) => void;
};

/**
 * Gestisce lo spostamento (move) e il ridimensionamento (resize) dei blocchi
 * prenotazione via pointer events. Nessuna dipendenza esterna.
 *
 * - Soglia anti-click: sotto {@link DRAG_THRESHOLD}px l'interazione resta un click.
 * - Snap alla griglia da 30 minuti (mezzi slot) letta dal DOM.
 * - Non chiama {@link onCommit} se la destinazione è invalida o invariata.
 */
export function useBookingDrag({ enabled, halfSlotsPerDay, isRangeFree, onCommit }: UseBookingDragParams) {
  const [dragState, setDragState] = useState<DragState>(null);
  const didDragRef = useRef(false);

  /** Da chiamare nell'onClick del blocco: true se l'ultima interazione era un drag (click da ignorare). */
  function consumeClickSuppression(): boolean {
    if (didDragRef.current) {
      didDragRef.current = false;
      return true;
    }
    return false;
  }

  function startDrag(e: React.PointerEvent, opts: StartDragOptions) {
    if (!enabled || e.button !== 0) return;
    e.stopPropagation(); // impedisce al drag-to-scroll del contenitore di attivarsi

    const { bookingId, court, startSlot, duration, mode } = opts;
    const startX = e.clientX;
    const startY = e.clientY;

    // Dimensioni del blocco e offset del punto afferrato (in px), per rendere
    // l'anteprima a grandezza piena che segue il cursore.
    const blockEl = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-booking-block]") ?? (e.currentTarget as HTMLElement);
    const rect = blockEl.getBoundingClientRect();
    const preview = {
      width: rect.width,
      height: rect.height,
      offsetX: startX - rect.left,
      offsetY: startY - rect.top,
    };

    // Offset (in mezzi slot) tra l'inizio del blocco e il punto afferrato,
    // così durante il move il punto afferrato resta sotto il cursore.
    const grab = readSlotAtPoint(startX, startY);
    const grabOffset =
      mode === "move" && grab && grab.court === court
        ? Math.max(0, Math.min(duration - 1, grab.slotIndex - startSlot))
        : 0;

    let started = false;
    didDragRef.current = false;

    // Disabilita la selezione del testo per tutta la durata del drag.
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const clampStart = (slot: number) => Math.max(0, Math.min(halfSlotsPerDay - duration, slot));

    // Ultima posizione valida: se il cursore esce dalla griglia (target null)
    // manteniamo questa invece di tornare all'origine.
    let lastGhost: DragGhost = {
      court,
      startSlot,
      duration,
      invalid: !isRangeFree(court, startSlot, duration, bookingId),
    };

    function computeGhost(x: number, y: number): DragGhost {
      const target = readSlotAtPoint(x, y);
      if (mode === "move") {
        if (!target) return lastGhost;
        const c = target.court;
        const s = clampStart(target.slotIndex - grabOffset);
        lastGhost = { court: c, startSlot: s, duration, invalid: !isRangeFree(c, s, duration, bookingId) };
        return lastGhost;
      }
      // resize del bordo finale: campo e inizio fissi, cambia la durata
      let d = duration;
      if (target && target.court === court) {
        d = Math.max(1, Math.min(halfSlotsPerDay - startSlot, target.slotIndex - startSlot + 1));
      } else {
        return lastGhost;
      }
      lastGhost = { court, startSlot, duration: d, invalid: !isRangeFree(court, startSlot, d, bookingId) };
      return lastGhost;
    }

    // Coalescenza dei movimenti: aggiorniamo lo stato al massimo una volta per
    // frame (~60fps) invece che a ogni pointermove (che può scattare 120+/s).
    let rafId: number | null = null;
    let pending: { x: number; y: number } | null = null;

    function flush() {
      rafId = null;
      if (!pending) return;
      const { x, y } = pending;
      pending = null;
      setDragState({ bookingId, mode, ghost: computeGhost(x, y), pointer: { x, y }, preview });
    }

    function onMove(ev: PointerEvent) {
      if (!started) {
        if (Math.abs(ev.clientX - startX) < DRAG_THRESHOLD && Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) {
          return;
        }
        started = true;
        didDragRef.current = true;
      }
      ev.preventDefault();
      pending = { x: ev.clientX, y: ev.clientY };
      if (rafId === null) rafId = requestAnimationFrame(flush);
    }

    function cleanup() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pending = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      document.body.style.userSelect = prevUserSelect;
      setDragState(null);
    }

    function onUp(ev: PointerEvent) {
      const wasDragging = started;
      const ghost = wasDragging ? computeGhost(ev.clientX, ev.clientY) : null;
      cleanup();
      if (!wasDragging || !ghost || ghost.invalid) return;
      if (ghost.court === court && ghost.startSlot === startSlot && ghost.duration === duration) return;
      onCommit(bookingId, { court: ghost.court, startSlot: ghost.startSlot, duration: ghost.duration });
    }

    function onCancel() {
      cleanup();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }

  return { dragState, startDrag, consumeClickSuppression };
}
