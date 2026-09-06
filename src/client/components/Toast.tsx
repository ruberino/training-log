import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastContextValue = {
  showToast: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((value: string) => {
    if (timeoutId.current !== null) {
      clearTimeout(timeoutId.current);
    }
    setText(value);
    timeoutId.current = setTimeout(() => {
      setText(null);
      timeoutId.current = null;
    }, 3000);
  }, []);

  useEffect(
    () => () => {
      if (timeoutId.current !== null) {
        clearTimeout(timeoutId.current);
      }
    },
    [],
  );

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
