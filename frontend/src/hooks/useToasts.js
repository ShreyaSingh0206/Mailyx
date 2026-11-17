import { useCallback, useEffect, useRef, useState } from "react";

export default function useToasts() {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message, type = "success") => {
      const id = ++nextId.current;
      setToasts((current) => [...current, { id, message, type }]);
      timers.current.set(id, setTimeout(() => dismiss(id), 5000));
      return id;
    },
    [dismiss]
  );

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    []
  );

  return { toasts, notify, dismiss };
}
