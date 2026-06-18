import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';

interface DBEventDetail {
  active: boolean;
  message?: string;
  operation?: string;
  success?: boolean;
  error?: any;
}

interface ToastItem {
  id: string;
  type: 'loading' | 'success' | 'error';
  message: string;
  operation?: string;
  timestamp: number;
}

export function DBStatusToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleDBLoading = (event: Event) => {
      const customEvent = event as CustomEvent<DBEventDetail>;
      const { active, message, operation, success, error } = customEvent.detail;
      const toastId = operation || 'db-op';

      if (active) {
        // Add or update loading toast
        setToasts(prev => {
          const filtered = prev.filter(t => t.id !== toastId);
          return [
            ...filtered,
            {
              id: toastId,
              type: 'loading',
              message: message || 'Consultando o banco de dados...',
              operation,
              timestamp: Date.now(),
            }
          ];
        });
      } else {
        // Operation completed: transition to success or error
        setToasts(prev => {
          const existing = prev.find(t => t.id === toastId);
          if (!existing) return prev;

          const updatedType = success ? 'success' : 'error';
          const defaultMsg = success 
            ? (existing.message.toLowerCase().includes('processando') 
                ? 'Processamento concluído com sucesso!' 
                : 'Consulta realizada com sucesso!')
            : 'Erro ao comunicar com o banco de dados.';

          const updatedMsg = error?.message 
            ? `Erro: ${error.message}` 
            : defaultMsg;

          // Replace the loading toast with the status result
          const newToasts = prev.map(t => {
            if (t.id === toastId) {
              return {
                ...t,
                type: updatedType,
                message: updatedMsg,
                timestamp: Date.now()
              };
            }
            return t;
          });

          return newToasts;
        });

        // Auto-remove success toasts after 3.5 seconds
        if (success) {
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId || t.type !== 'success'));
          }, 3500);
        }
      }
    };

    window.addEventListener('database-loading', handleDBLoading);
    return () => {
      window.removeEventListener('database-loading', handleDBLoading);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-16 right-4 md:right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isLoading = toast.type === 'loading';

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="pointer-events-auto"
            >
              <div
                id={`db-toast-${toast.id}`}
                className={`
                  w-full rounded-2xl p-4 shadow-xl border flex gap-3.5 items-start backdrop-blur-md transition-all
                  ${isLoading && 'bg-blue-50/95 text-blue-900 border-blue-200/80 shadow-blue-500/5'}
                  ${isSuccess && 'bg-emerald-50/95 text-emerald-900 border-emerald-200/80 shadow-emerald-500/5'}
                  ${isError && 'bg-rose-50/95 text-rose-900 border-rose-200/80 shadow-rose-500/5'}
                `}
              >
                {/* Icon Section */}
                <div className="flex-shrink-0 mt-0.5">
                  {isLoading && (
                    <div className="relative">
                      <Database className="w-5 h-5 text-blue-600" />
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin absolute inset-0 scale-[1.3] opacity-70" />
                    </div>
                  )}
                  {isSuccess && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-bounce" />
                  )}
                  {isError && (
                    <XCircle className="w-5 h-5 text-rose-500" />
                  )}
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                  <span className={`text-[10px] font-black uppercase tracking-wider block mb-0.5 opacity-70
                    ${isLoading && 'text-blue-700'}
                    ${isSuccess && 'text-emerald-700'}
                    ${isError && 'text-rose-700'}
                  `}>
                    {isLoading && 'Banco de Dados • Em Curso'}
                    {isSuccess && 'Banco de Dados • Sincronizado'}
                    {isError && 'Banco de Dados • Erro Crítico'}
                  </span>
                  
                  <p className="text-xs font-semibold leading-relaxed break-words">
                    {toast.message}
                  </p>
                  
                  {toast.operation && (
                    <span className="text-[9px] font-mono opacity-50 block mt-1">
                      op: {toast.operation}
                    </span>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className={`
                    p-1 rounded-lg transition-colors flex-shrink-0 cursor-pointer
                    ${isLoading && 'hover:bg-blue-100 text-blue-400 hover:text-blue-700'}
                    ${isSuccess && 'hover:bg-emerald-100 text-emerald-400 hover:text-emerald-700'}
                    ${isError && 'hover:bg-rose-100 text-rose-400 hover:text-rose-700'}
                  `}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
