import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Latex from 'react-latex-next';
import { useNavigate } from 'react-router-dom';
import { IoIosSave } from 'react-icons/io';
import { MdModeEdit, MdSimCardDownload } from 'react-icons/md';
import { FaCheck } from 'react-icons/fa';
import { FaXmark } from 'react-icons/fa6';
import gridImage from '../../../assets/cover-grid.png';
import type { MachineInfo } from '../../core/types';
import { machine, errorMessage } from '../lib/machine';
import { headSymbol, stackTops, stateToLatex } from '../lib/format';
import { useFlash } from '../components/FlashMessage';
import Item from '../components/Item';
import Stack from '../components/Stack';
import StateCard from '../components/StateCard';
import '../styles/execution.css';

export default function Execution() {
  const { show: showFlash, node: flashNode } = useFlash();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<HTMLInputElement>(null);
  const qBitsRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sCardsRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [info, setInfo] = useState<MachineInfo | null>(null);
  /** The whole word the user loaded, so the consumed part stays on screen. */
  const [word, setWord] = useState<string[]>([]);
  const [hasInput, setHasInput] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setInfo(await machine.info());
    } catch (e) {
      showFlash(errorMessage(e));
    }
  }, [showFlash]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const numOfStacks = info?.numOfStacks ?? 1;
  const states = info?.states ?? [];
  const stacks = info?.stacks ?? [];
  const currentState = info?.current_state ?? 0;
  const consumed = info?.consumed ?? 0;
  const accepted = info?.accepted ?? false;
  const rejected = info?.rejected ?? false;
  const halted = accepted || rejected;

  const head = headSymbol(info?.queues ?? []);
  const tops = stackTops(stacks);

  /** Run and Step only make sense once a word is loaded and before it halts. */
  const controlsDisabled = !hasInput || halted;

  const onSetClick = async () => {
    const value = queueRef.current?.value ?? '';
    try {
      // One round trip: the main process resets, validates the word against Σ
      // and hands back the fresh state. The old code fired three messages and
      // read the state back before the queue had been set.
      setInfo(await machine.setInput(value));
      setWord(value.split(''));
      setHasInput(true);
    } catch (e) {
      setHasInput(false);
      showFlash(errorMessage(e));
    }
  };

  const onStepClick = async () => {
    if (controlsDisabled) return;
    try {
      setInfo(await machine.step());
    } catch (e) {
      showFlash(errorMessage(e));
      refresh();
    }
  };

  const onRunClick = async () => {
    if (controlsDisabled) return;
    try {
      setInfo(await machine.run());
    } catch (e) {
      showFlash(errorMessage(e));
      refresh();
    }
  };

  const onResetClick = async () => {
    try {
      setInfo(await machine.reset());
      setWord([]);
      setHasInput(false);
      if (queueRef.current) queueRef.current.value = '';
    } catch (e) {
      showFlash(errorMessage(e));
    }
  };

  const handleSaveClick = async () => {
    try {
      const filePath = await machine.save();
      if (filePath) showFlash(`Saved to ${filePath}`);
    } catch (e) {
      showFlash(errorMessage(e));
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setInfo(await machine.load(file.path));
      setWord([]);
      setHasInput(false);
      if (queueRef.current) queueRef.current.value = '';
    } catch (e) {
      showFlash(errorMessage(e));
    }
  };

  // Keep the tape head and the active state card in view.
  useEffect(() => {
    qBitsRefs.current[consumed]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  }, [consumed]);

  useEffect(() => {
    if (currentState >= 0) {
      sCardsRefs.current[currentState]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentState]);

  return (
    <div className="mainExecContainer">
      {flashNode}
      <img src={gridImage} alt="" draggable="false" id="bggrid" />

      <div className="execControl">
        <div className="">
          <h2>
            Input String
            {accepted && (
              <div className="AR_state accepted">
                Accepted <FaCheck style={{ marginLeft: 10, fontSize: 18 }} />
              </div>
            )}
            {rejected && (
              <div className="AR_state rejected">
                Rejected
                <FaXmark style={{ marginLeft: 10, fontSize: 22 }} />
              </div>
            )}
          </h2>
          <div className="inputString">
            {word.map((e, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className={i === consumed ? 'tapeHead' : ''}
                ref={(el) => {
                  qBitsRefs.current[i] = el;
                }}
              >
                {e}
              </div>
            ))}
          </div>
        </div>
        <div className="execDefinition">
          <div className="execLang">
            <Latex>{`$${info?.lang || '\\varnothing'}$`}</Latex>
          </div>
          <Item name="Alphabet" value={info?.alpha ?? []} latex="$\Sigma$" />
          <Item
            name="Stack Alphabet"
            value={info?.auxAlpha ?? []}
            latex="$\Gamma$"
          />
          <Item
            name="States"
            value={states.map((_, i) => stateToLatex(i))}
            latex="$Q$"
          />
          <Item name="Final State" value="$\{q_f\}$" latex="$F$" />
        </div>
        <div className="execControlButtons">
          <div className="it1">
            <button type="button" onClick={handleSaveClick}>
              <IoIosSave style={{ fontSize: 20, marginRight: 5 }} /> Save
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <input
                type="file"
                accept="application/json,.json"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <MdSimCardDownload style={{ fontSize: 20, marginRight: 5 }} />{' '}
              Load
            </button>
            <button type="button" onClick={() => navigate('/setVar')}>
              <MdModeEdit style={{ fontSize: 20, marginRight: 5 }} /> New
            </button>
          </div>
          <div className="it2">
            <input
              type="text"
              name="text"
              id="inputString"
              placeholder="Input String"
              ref={queueRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSetClick();
              }}
            />
            <input type="button" value="Set" onClick={onSetClick} />
            <input
              type="button"
              value="Reset"
              onClick={onResetClick}
              style={{ marginLeft: 10 }}
            />
          </div>
          <div className="it3">
            <button
              type="button"
              className={controlsDisabled ? 'disabled_button' : ''}
              onClick={onRunClick}
            >
              Run
            </button>
            <button
              type="button"
              onClick={onStepClick}
              className={controlsDisabled ? 'disabled_button' : ''}
            >
              Step
            </button>
          </div>
        </div>
      </div>
      <div className="execStates">
        <h2>States</h2>
        {states.map((state, i) => (
          <StateCard
            key={state.id}
            id={i}
            rules={state.rules}
            active={currentState === i}
            head={head}
            tops={tops}
            ref={(el) => {
              sCardsRefs.current[i] = el;
            }}
          />
        ))}
        <div
          className={
            accepted ? 'state final-state active-state' : 'state final-state'
          }
        >
          <div className="stateTitle">
            <Latex>$q_f$</Latex>
          </div>
        </div>
      </div>
      <div className="execStacks">
        <h2>Stacks</h2>
        <div className="stackContainer">
          {Array.from({ length: numOfStacks }, (_, index) => (
            <Stack key={index} number={index + 1} elements={stacks[index]} />
          ))}
        </div>
      </div>
    </div>
  );
}
