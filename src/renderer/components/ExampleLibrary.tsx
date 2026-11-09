import { useEffect, useState } from 'react';
import Latex from 'react-latex-next';
import { VscClose } from 'react-icons/vsc';
import type { ExampleSummary } from '../../shared/ipc';
import { machine, errorMessage } from '../lib/machine';
import '../styles/examples.css';

interface ExampleLibraryProps {
  onClose: () => void;
  /** Called once a machine has been loaded into the model. */
  onLoaded: (example: ExampleSummary) => void;
  onError: (message: string) => void;
}

/**
 * Lists the machines shipped in `assets/examples` and loads the one picked.
 * Drop a new JSON file in that folder and it shows up here.
 */
export default function ExampleLibrary({
  onClose,
  onLoaded,
  onError,
}: ExampleLibraryProps) {
  const [examples, setExamples] = useState<ExampleSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    machine
      .examples()
      .then((list) => {
        if (!cancelled) setExamples(list);
        return list;
      })
      .catch((e) => {
        if (!cancelled) {
          setExamples([]);
          onError(errorMessage(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const pick = async (example: ExampleSummary) => {
    try {
      await machine.loadExample(example.id);
      onLoaded(example);
    } catch (e) {
      onError(errorMessage(e));
    }
  };

  return (
    <div className="examples-overlay" onClick={onClose} role="presentation">
      <div
        className="examples-panel"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <header>
          <h3>Example Languages</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <VscClose />
          </button>
        </header>
        <div className="examples-list">
          {examples === null && <div className="examples-empty">Loading…</div>}
          {examples !== null && examples.length === 0 && (
            <div className="examples-empty">
              No examples found in assets/examples.
            </div>
          )}
          {examples?.map((example) => (
            <div
              key={example.id}
              className="example-row"
              onClick={() => pick(example)}
              role="presentation"
            >
              <div className="example-meta">
                <h4>{example.name}</h4>
                <span className="example-lang">
                  <Latex>{`$${example.lang}$`}</Latex>
                </span>
              </div>
              <span className="example-stacks">
                {example.stacks} stack{example.stacks > 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
