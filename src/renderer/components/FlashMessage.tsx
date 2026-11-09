import { useCallback, useEffect, useState } from 'react';
import { IoIosWarning } from 'react-icons/io';

interface FlashProps {
  text: string;
  onDisappear: () => void;
}

/** The toast used on every page (it used to be copy-pasted three times). */
export default function FlashMessage({ text, onDisappear }: FlashProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const hide = setTimeout(() => setIsVisible(false), 5000);
    const remove = setTimeout(onDisappear, 5200);
    return () => {
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, [onDisappear]);

  return (
    <div
      style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}
      className="flash-active"
    >
      <IoIosWarning style={{ fontSize: 20, marginRight: 5 }} />
      {text}
    </div>
  );
}

/** Pairs with `<FlashMessage/>`: `const { flash, show, node } = useFlash()`. */
export function useFlash() {
  const [text, setText] = useState<string | null>(null);
  const hide = useCallback(() => setText(null), []);
  const show = useCallback((message: unknown) => {
    setText(message instanceof Error ? message.message : String(message));
  }, []);
  const node =
    text === null ? null : <FlashMessage text={text} onDisappear={hide} />;
  return { show, hide, node };
}
