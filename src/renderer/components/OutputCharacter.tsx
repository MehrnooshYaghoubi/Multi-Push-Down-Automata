import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Latex from 'react-latex-next';
import { MdOutlineRemoveCircleOutline } from 'react-icons/md';
import { IoIosArrowDown } from 'react-icons/io';

/* eslint-disable react/require-default-props, react/no-array-index-key */
interface OutputCharacterProps {
  char: string;
  onRemove?: () => void;
  removeButton?: boolean;
}

/** A symbol chip with an optional remove button. */
export function OutputCharacter({
  char,
  onRemove,
  removeButton = true,
}: OutputCharacterProps) {
  return (
    <span className="charcterOutput">
      <Latex>{`$${char}$`}</Latex>
      {removeButton && (
        <span className="removeIcon" onClick={onRemove} role="presentation">
          <MdOutlineRemoveCircleOutline />
        </span>
      )}
    </span>
  );
}

export interface SymbolPickerHandle {
  getCurrentChar: () => string;
  reset: () => void;
}

interface SymbolPickerProps {
  initial: string;
  possibleChars: string[];
}

/** One dropdown slot of a rule being built. */
export const SymbolPicker = forwardRef<SymbolPickerHandle, SymbolPickerProps>(
  ({ initial, possibleChars }, ref) => {
    const [currentChar, setChar] = useState(initial);
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const dropdownRef = useRef<HTMLSpanElement>(null);

    useImperativeHandle(ref, () => ({
      getCurrentChar: () => currentChar,
      reset: () => setChar(initial),
    }));

    // Keep the shown value in sync when the surrounding rule changes shape
    // (e.g. the user went back and picked a different state).
    useEffect(() => setChar(initial), [initial]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setDropdownVisible(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <span
        className="charcterOutputForRules"
        ref={dropdownRef}
        onClick={() => setDropdownVisible((prev) => !prev)}
        role="presentation"
      >
        <Latex>{`\${${currentChar}}$`}</Latex>
        <span className="RulesIcon">
          <IoIosArrowDown />
        </span>
        {isDropdownVisible && (
          <span className="dropdown">
            <ul>
              {possibleChars.map((e) => (
                <li key={e} onClick={() => setChar(e)} role="presentation">
                  <Latex>{`$${e}$`}</Latex>
                </li>
              ))}
            </ul>
          </span>
        )}
      </span>
    );
  },
);

SymbolPicker.displayName = 'SymbolPicker';

interface RuleRowProps {
  state: string;
  left: string[];
  right: string[];
  onRemove?: () => void;
}

/** A finished rule in the "current rules" list. */
export function RuleRow({ state, left, right, onRemove }: RuleRowProps) {
  return (
    <li>
      <span className="currentValue rules_values">
        <Latex>{`$\\delta(${state}, \\;$ `}</Latex>
        {left.map((e, i) => (
          <Latex key={`l-${i}-${e}`}>
            ${e} {i + 1 === left.length ? '' : ', \\;'} $
          </Latex>
        ))}
        <Latex>$) = ($</Latex>
        {right.map((e, i) => (
          <Latex key={`r-${i}-${e}`}>
            ${e} {i + 1 === right.length ? '' : ',   \\;'} $
          </Latex>
        ))}
        <Latex>$)$</Latex>
      </span>
      {onRemove && (
        <button
          type="button"
          className="currentValueRemoveButton"
          onClick={onRemove}
        >
          <MdOutlineRemoveCircleOutline />
        </button>
      )}
    </li>
  );
}

export default OutputCharacter;
