'use client';

import { useState } from 'react';
import CalendarMonth, { atNoon, firstOfMonth } from '@/components/ui/CalendarMonth';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data attualmente scelta: il calendario si apre su questa. */
  value: Date;
  /** Chiamata con la data confermata (a mezzogiorno); la finestra si chiude da sola. */
  onApply: (date: Date) => void;
  /** Giorni prima di oggi non selezionabili. */
  disablePast?: boolean;
  /** Ultimo giorno selezionabile. */
  maxDate?: Date;
  title?: string;
};

/** Finestra "Seleziona data": calendario, pulsante Oggi e conferma. */
export default function DatePickerModal({
  open,
  onOpenChange,
  value,
  onApply,
  disablePast = false,
  maxDate,
  title = 'Seleziona Data',
}: Props) {
  const [pendingDate, setPendingDate] = useState<Date>(() => atNoon(value));
  const [month, setMonth] = useState<Date>(() => firstOfMonth(value));

  const showDate = (date: Date) => {
    setPendingDate(atNoon(date));
    setMonth(firstOfMonth(date));
  };

  // A ogni apertura si riparte dalla data scelta (stato aggiornato durante il render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) showDate(value);
  }

  const isDisabled = (date: Date) => {
    if (disablePast) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return true;
    }
    if (maxDate) {
      const lastDay = new Date(maxDate);
      lastDay.setHours(23, 59, 59, 999);
      if (date > lastDay) return true;
    }
    return false;
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="sm"
        showBuiltinClose={false}
        className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white"
      >
        <ModalHeader
          withCloseButton
          closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10"
          className="px-4 py-3 bg-secondary border-b border-secondary"
        >
          <ModalTitle className="font-semibold text-white">{title}</ModalTitle>
        </ModalHeader>
        <ModalBody className="px-4 py-4 bg-white">
          <CalendarMonth
            variant="plain"
            month={month}
            onMonthChange={setMonth}
            selected={pendingDate}
            onSelect={showDate}
            isDisabled={isDisabled}
          />
        </ModalBody>
        <ModalFooter className="p-0 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => showDate(new Date())}
            className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(pendingDate);
              onOpenChange(false);
            }}
            className="flex-1 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Applica
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
