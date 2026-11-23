import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-50 flex flex-col gap-2.5 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const isSuccess = toast.variant === 'success';
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              role={isSuccess ? 'status' : 'alert'}
              className={`pointer-events-auto rounded-xl border p-4 shadow-2xl shadow-black/50 backdrop-blur-md flex items-start gap-3 ${
                isSuccess
                  ? 'bg-[#0c3123]/95 border-emerald-400/35 text-[#f4f1ea]'
                  : 'bg-[#351114]/95 border-red-400/40 text-red-50'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
              )}

              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold leading-snug">{toast.title}</p>
                <p className="text-xs text-[#d6dfd9] leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Close notification"
                className="p-1 rounded-md text-[#cbd5d0] hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
