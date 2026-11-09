/* The wizard steps live below the page component that composes them. */
/* eslint-disable no-use-before-define */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Latex from 'react-latex-next';
import { IoLanguage, IoArrowBackCircleOutline } from 'react-icons/io5';
import { BsStack } from 'react-icons/bs';
import { BiSolidDirections } from 'react-icons/bi';
import { FaRuler } from 'react-icons/fa6';
import gridImage from '../../../assets/cover-grid.png';
import { machine, errorMessage } from '../lib/machine';
import { useFlash } from '../components/FlashMessage';
import Item from '../components/Item';
import {
  OutputCharacter,
  RuleRow,
  SymbolPicker,
  type SymbolPickerHandle,
} from '../components/OutputCharacter';
import { wizardRulesOverlap, type WizardSetup } from '../../shared/wizard';
import '../styles/variables.css';
import 'katex/dist/katex.min.css';

const STEPS = 6;
const MAX_STATES = 20;

const EPSILON_TOKEN = '\\varepsilon';
const EMPTY_TOKEN = '?';

export default function Variables() {
  const navigate = useNavigate();
  const { show: showFlash, node: flashNode } = useFlash();
  const [step, setStep] = useState(0);
  const [setup, setSetup] = useState<WizardSetup>({
    numOfStacks: 1,
    Alphabet: [],
    StackAlphabet: [],
    States: ['q_{0}'],
    ProgramFunction: [],
    Langauge: '',
  });

  const patch = (changes: Partial<WizardSetup>) =>
    setSetup((prev) => ({ ...prev, ...changes }));

  const nStacks = setup.numOfStacks ?? 1;

  const build = async (language: string) => {
    const complete: WizardSetup = { ...setup, Langauge: language };
    try {
      await machine.build(complete);
      // Only leave the wizard once the main process accepted the machine. The
      // old code navigated immediately and registered the error listener
      // afterwards, so an invalid program silently opened a broken screen.
      navigate('/exec');
    } catch (e) {
      showFlash(errorMessage(e));
    }
  };

  return (
    <div className="vars_main">
      {flashNode}
      <img src={gridImage} alt="" draggable="false" id="bggrid" />
      <div className="definition">
        <IoArrowBackCircleOutline
          className="backButtonDef"
          onClick={() => navigate('/')}
        />
        <div>
          <h2>Machine Definition</h2>
          <span className="latex">
            <Latex>
              {'$M = \\{ \\Sigma, Q, \\delta, q_0, F, \\Gamma, N  \\}$'}
            </Latex>
          </span>
        </div>
      </div>

      <div className="currentVars">
        <Item
          latex="$N$"
          name="Number Of Stacks"
          value={`$${nStacks}$`}
          active={step === 0}
        />
        <Item
          latex="$\Sigma$"
          name="Alphabet"
          value={setup.Alphabet ?? []}
          active={step === 1}
        />
        <Item
          latex="$\Gamma$"
          name="Stack Alphabet"
          value={setup.StackAlphabet ?? []}
          active={step === 2}
        />
        <Item
          latex="$Q$"
          name="State Sets"
          value={setup.States ?? []}
          active={step === 3}
        />
        <Item
          latex="$\delta$"
          name="Program Function"
          value={(setup.ProgramFunction ?? []).map(
            (rule) => `\\Pi(${rule[0]}, ...)`,
          )}
          active={step === 4}
        />
        <Item
          latex="$L$"
          name="Program Language"
          // This row used to render the program function by mistake, so the
          // language the user typed never showed up.
          value={setup.Langauge ? `$${setup.Langauge}$` : '$\\varnothing$'}
          active={step === 5}
        />
      </div>

      <div className="form">
        <span className="steps">
          Step {step + 1}/{STEPS}
        </span>

        {step === 0 && (
          <NumberOfStacks
            value={nStacks}
            onNext={(value) => {
              if (!Number.isFinite(value) || value < 1 || value > 10) {
                showFlash('Stack Number Should Be Between 1 And 10');
                return;
              }
              patch({ numOfStacks: value });
              setStep(1);
            }}
          />
        )}

        {step === 1 && (
          <AlphabetStep
            title="Define The Alphabet"
            symbol="\Sigma"
            value={setup.Alphabet ?? []}
            onChange={(Alphabet) => patch({ Alphabet })}
            onBack={() => setStep(0)}
            onNext={() => {
              if ((setup.Alphabet ?? []).length === 0) {
                showFlash('Alphabet Is Required');
                return;
              }
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <AlphabetStep
            title="Define The Stack Alphabet"
            symbol="\Gamma"
            value={setup.StackAlphabet ?? []}
            onChange={(StackAlphabet) => patch({ StackAlphabet })}
            onBack={() => setStep(1)}
            onNext={() => {
              const clash = (setup.StackAlphabet ?? []).find((s) =>
                (setup.Alphabet ?? []).includes(s),
              );
              if (clash) {
                showFlash(
                  "Stack Alphabet Shouldn't Contain Alphabet Characters",
                );
                return;
              }
              setStep(3);
            }}
          />
        )}

        {step === 3 && (
          <StateSets
            value={setup.States ?? []}
            onChange={(States) => patch({ States })}
            onBack={() => setStep(2)}
            onNext={() => {
              const states = setup.States ?? [];
              if (states.length === 0) {
                showFlash('At Least One State Is Required');
                return;
              }
              if (states.length > MAX_STATES) {
                showFlash('Maximum Amount Of States Reached');
                return;
              }
              setStep(4);
            }}
          />
        )}

        {step === 4 && (
          <ProgramFunction
            setup={setup}
            onChange={(rules) => patch({ ProgramFunction: rules })}
            onError={showFlash}
            onBack={() => setStep(3)}
            onNext={() => {
              if ((setup.ProgramFunction ?? []).length === 0) {
                showFlash('No Function Specified');
                return;
              }
              setStep(5);
            }}
          />
        )}

        {step === 5 && (
          <LanguageStep
            value={setup.Langauge ?? ''}
            onChange={(Langauge) => patch({ Langauge })}
            onBack={() => setStep(4)}
            onNext={(language) => {
              if (language.trim() === '') {
                showFlash('Language Cannot Be Null');
                return;
              }
              build(language);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 1 */

function NumberOfStacks({
  value,
  onNext,
}: {
  value: number;
  onNext: (value: number) => void;
}) {
  const [current, setCurrent] = useState(value);
  return (
    <div>
      <h3 className="title">
        <BsStack style={{ marginRight: 10, fontSize: 25 }} /> Define Number Of
        Stacks
      </h3>
      <hr />
      <div className="alphabetForm">
        <span className="inputText">Enter The Number</span>
        <div className="numofStackInputForm">
          <input
            type="number"
            value={current}
            min={1}
            max={10}
            onChange={(e) => setCurrent(Number(e.target.value))}
          />
        </div>
        <input
          type="button"
          value="Next Step"
          onClick={() => onNext(current)}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- steps 2, 3 */

function AlphabetStep({
  title,
  symbol,
  value,
  onChange,
  onBack,
  onNext,
}: {
  title: string;
  symbol: string;
  value: string[];
  onChange: (value: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  const add = () => {
    const char = input.current?.value ?? '';
    if (char === '') return;
    if (!value.includes(char)) onChange([...value, char]);
    if (input.current) input.current.value = '';
  };

  // The previous version worked out which chip to delete from its position in
  // the DOM (and was off by one because of the surrounding `{` node), so it
  // removed the wrong symbol. The index comes straight from the list now.
  const remove = (index: number) =>
    onChange(value.filter((_, i) => i !== index));

  return (
    <div>
      <h3 className="title">
        <IoLanguage style={{ marginRight: 10, fontSize: 25 }} /> {title}
      </h3>
      <hr />
      <div className="alphabetForm">
        <span className="inputText">Enter A Character</span>
        <div className="alphawrapper">
          <input
            type="text"
            maxLength={1}
            ref={input}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
          />
          <button type="button" onClick={add}>
            Add
          </button>
        </div>
        <div className="output">
          <h4>Current Alphabet:</h4>
          <span className="currentValue">
            <Latex>{`$${symbol}=\\{$ `}</Latex>
            {value.map((e, i) => (
              <span key={e}>
                <OutputCharacter char={e} onRemove={() => remove(i)} />
                {i + 1 === value.length ? '' : ','}
              </span>
            ))}
            <Latex>{'$\\}$'}</Latex>
          </span>
        </div>
        <div className="buttonsContainer">
          <input type="button" value="Back" onClick={onBack} id="backButton" />
          <input type="button" value="Next Step" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 4 */

function StateSets({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  const add = () => {
    const count = Number(input.current?.value);
    if (!Number.isFinite(count) || count < 1) return;
    const added = Array.from(
      { length: Math.min(count, MAX_STATES - value.length) },
      (_, i) => `q_{${value.length + i}}`,
    );
    onChange([...value, ...added]);
  };

  return (
    <div>
      <h3 className="title">
        <BiSolidDirections style={{ marginRight: 10, fontSize: 25 }} /> Define
        The State Sets
      </h3>
      <hr />
      <div className="alphabetForm">
        <span className="inputText">
          Enter The Number Of States You Wish To Add
        </span>
        <div className="numOFStates">
          <input type="number" min={1} max={10} defaultValue={1} ref={input} />
          <button type="button" onClick={add}>
            Add
          </button>
        </div>
        <div className="output">
          <h4>Current State Sets:</h4>
          <span className="currentValue">
            <Latex>{'$Q=\\{$ '}</Latex>
            {value.map((e, i) => (
              <span key={e}>
                <OutputCharacter
                  char={e}
                  // Only the last state can go, otherwise the remaining ids
                  // would no longer match the rules already written.
                  removeButton={i + 1 === value.length && value.length > 1}
                  onRemove={() => onChange(value.slice(0, -1))}
                />
                {i + 1 === value.length ? '' : ','}
              </span>
            ))}
            <Latex>{'$\\}$'}</Latex>
          </span>
        </div>
        <div className="buttonsContainer">
          <input type="button" value="Back" onClick={onBack} id="backButton" />
          <input type="button" value="Next Step" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 5 */

function ProgramFunction({
  setup,
  onChange,
  onError,
  onBack,
  onNext,
}: {
  setup: WizardSetup;
  onChange: (rules: string[][]) => void;
  onError: (message: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const nStacks = setup.numOfStacks ?? 1;
  const states = setup.States ?? [];
  const alphabet = setup.Alphabet ?? [];
  const stackAlphabet = setup.StackAlphabet ?? [];
  const rules = setup.ProgramFunction ?? [];

  const [tab, setTab] = useState(0);

  /** X, Y₁..Yₙ, q', W₁..Wₙ */
  const slots = nStacks * 2 + 2;
  const half = nStacks + 1;

  // Rebuilt when the stack count changes — the refs array used to be created
  // once, so going back and adding a stack left the rule builder a slot short.
  const refs = useMemo(
    () =>
      Array.from({ length: slots }, () => ({
        current: null as SymbolPickerHandle | null,
      })),
    [slots],
  );

  useEffect(() => {
    if (tab >= states.length) setTab(0);
  }, [states.length, tab]);

  const readChoices = (i: number) =>
    i === 0
      ? [EPSILON_TOKEN, EMPTY_TOKEN, ...alphabet]
      : [EPSILON_TOKEN, EMPTY_TOKEN, ...alphabet, ...stackAlphabet];

  const writeChoices = (i: number) =>
    i === half
      ? [...states, 'q_f']
      : [EPSILON_TOKEN, ...alphabet, ...stackAlphabet];

  const add = () => {
    const tokens = refs.map(
      (r) => r.current?.getCurrentChar() ?? EPSILON_TOKEN,
    );
    const rule = [`q_{${tab}}`, ...tokens];

    const readPart = rule.slice(1, half + 1);
    if (readPart.every((t) => t === EPSILON_TOKEN)) {
      onError("Rule Can't Be Fully Generic");
      return;
    }

    const clash = rules.find((existing) =>
      wizardRulesOverlap(existing, rule, nStacks),
    );
    if (clash) {
      onError(
        `Ambiguous Rule: q_{${tab}} already has a rule that reads the same configuration`,
      );
      return;
    }

    onChange([...rules, rule]);
  };

  return (
    <div>
      <h3 className="title">
        <FaRuler style={{ marginRight: 10, fontSize: 25 }} /> Define The Program
        Function
      </h3>
      <hr />
      <span className="tabTitle">Current State:</span>
      <div className="tabs">
        {states.map((e, i) => (
          <span
            key={e}
            className={tab === i ? 'activeTab tabItem' : 'tabItem'}
            onClick={() => setTab(i)}
            role="presentation"
          >
            <Latex>{`$${e}$`}</Latex>
          </span>
        ))}
      </div>
      <div className="alphabetForm programfunction">
        <h4>Add A New Rule:</h4>
        <div className="output">
          <span className="currentValue">
            <Latex>{`$\\delta(q_{${tab}}$`}</Latex>,
            {refs.slice(0, half).map((ref, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={`read-${i}`}>
                <SymbolPicker
                  initial={EPSILON_TOKEN}
                  possibleChars={readChoices(i)}
                  ref={ref}
                />
                {i + 1 === half ? '' : ','}
              </span>
            ))}
            <Latex>$) = ($</Latex>
            {refs.slice(half).map((ref, j) => {
              const i = half + j;
              return (
                // eslint-disable-next-line react/no-array-index-key
                <span key={`write-${i}`}>
                  <SymbolPicker
                    initial={i === half ? `q_{${tab}}` : EPSILON_TOKEN}
                    possibleChars={writeChoices(i)}
                    ref={ref}
                  />
                  {i + 1 === slots ? '' : ','}
                </span>
              );
            })}
            <Latex>$)$</Latex>
          </span>
          <button type="button" onClick={add}>
            Add
          </button>
        </div>
        <div className="currentRules">
          <h4>Current Rules:</h4>
          <ol>
            {rules.map((rule, index) => {
              if (rule[0] !== `q_{${tab}}`) return null;
              const tokens = rule.slice(1);
              return (
                <RuleRow
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  state={rule[0]}
                  left={tokens.slice(0, half)}
                  right={tokens.slice(half)}
                  onRemove={() => onChange(rules.filter((_, i) => i !== index))}
                />
              );
            })}
          </ol>
        </div>
        <div className="buttonsContainer">
          <input type="button" value="Back" onClick={onBack} id="backButton" />
          <input type="button" value="Next Step" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ step 6 */

function LanguageStep({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: (value: string) => void;
}) {
  const [current, setCurrent] = useState(value);
  return (
    <div>
      <h3 className="title">
        <BsStack style={{ marginRight: 10, fontSize: 25 }} /> Define Language
      </h3>
      <hr />
      <div className="alphabetForm">
        <span className="inputText">Langauge</span>
        <div className="numofStackInputForm">
          <input
            type="text"
            value={current}
            placeholder="\{a^n b^n \mid n \geq 0\}"
            onChange={(e) => {
              setCurrent(e.target.value);
              onChange(e.target.value);
            }}
          />
        </div>
        <div className="buttonsContainer">
          <input type="button" value="Back" onClick={onBack} id="backButton" />
          <input
            type="button"
            value="Next Step"
            onClick={() => onNext(current)}
          />
        </div>
      </div>
    </div>
  );
}
