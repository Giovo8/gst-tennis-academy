"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within Modal component");
  }
  return context;
}

interface ModalProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Modal({ children, open: controlledOpen, onOpenChange }: ModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const openModal = () => {
    if (!isControlled) {
      setUncontrolledOpen(true);
    }
    onOpenChange?.(true);
  };

  const closeModal = () => {
    if (!isControlled) {
      setUncontrolledOpen(false);
    }
    onOpenChange?.(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <ModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function ModalTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { openModal } = useModal();

  if (asChild) {
    return <div onClick={openModal}>{children}</div>;
  }

  return (
    <button onClick={openModal} type="button">
      {children}
    </button>
  );
}

interface ModalContentProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlayClick?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
};

export function ModalContent({
  children,
  className = "",
  size = "md",
  closeOnOverlayClick = true,
}: ModalContentProps) {
  const { isOpen, closeModal } = useModal();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={closeOnOverlayClick ? closeModal : undefined}
    >
      <div
        className={`
          relative w-full ${sizeClasses[size]}
          bg-white dark:bg-slate-900
          rounded-xl shadow-2xl
          border border-slate-200 dark:border-slate-800
          animate-slide-in
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 ${className}`}>
      {children}
    </div>
  );
}

export function ModalTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-xl font-semibold text-slate-900 dark:text-white ${className}`}>
      {children}
    </h2>
  );
}

export function ModalDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`mt-1 text-sm text-slate-600 dark:text-slate-400 ${className}`}>
      {children}
    </p>
  );
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
}
