import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastContextValue = {
  showToast: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);

  const showToast = useCallback((value: string) => {
    setText(value);
    setTimeout(() => setText(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {text !== null && <div role="status">{text}</div>}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
