/**
 * Translation between the step-by-step wizard in the renderer and the
 * `MachineConfig` the automaton understands.
 *
 * The wizard collects each rule as a flat array of LaTeX-ish tokens:
 *
 *     [ 'q_{0}', X, Y₁..Yₙ, q', W₁..Wₙ ]
 *
 * which is 2n+2 tokens plus the source state.
 */
import {
  EMPTY,
  EPSILON,
  FINAL,
  type MachineConfig,
  type Rule,
  type Sym,
} from '../core/types';

export interface WizardSetup {
  numOfStacks?: number;
  Alphabet?: string[];
  StackAlphabet?: string[];
  States?: string[];
  ProgramFunction?: string[][];
  /** Kept under the wizard's original (misspelled) key for compatibility. */
  Langauge?: string;
}

/** `\varepsilon` → -1, `?` → -2, anything else stays as it is. */
export function tokenToSymbol(token: string): Sym {
  if (token === '\\varepsilon' || token === '' || token == null) return EPSILON;
  if (token === '?') return EMPTY;
  return token;
}

/** `q_f` → FINAL, `q_{3}` / `q_3` / `3` → 3. */
export function tokenToStateId(token: string): number {
  if (token === 'q_f' || token === 'q_{f}') return FINAL;
  const match = String(token).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : FINAL;
}

export function setupToConfig(setup: WizardSetup): MachineConfig {
  const nStacks = Math.max(1, Math.min(10, Number(setup.numOfStacks) || 1));
  const states = setup.States ?? [];
  const program = setup.ProgramFunction ?? [];

  return {
    stacks: nStacks,
    alphabet: setup.Alphabet ?? [],
    aux_alphabet: setup.StackAlphabet ?? [],
    lang: setup.Langauge ?? '',
    states: states.map((stateToken, id) => ({
      id,
      // `slice()` everywhere: the wizard keeps this array in React state, so
      // mutating it (the old code used `shift()`) corrupted the rule list and
      // dropped rules for every state after the first.
      rules: program
        .filter((rule) => rule[0] === stateToken)
        .map((rule): Rule => {
          const tokens = rule.slice(1);
          const half = Math.ceil(tokens.length / 2);
          const read = tokens.slice(0, half).map(tokenToSymbol);
          const write = tokens.slice(half);
          return {
            X: read[0] ?? EPSILON,
            Y: read.slice(1),
            q: tokenToStateId(write[0]),
            W: write.slice(1).map(tokenToSymbol),
          };
        }),
    })),
  };
}

/**
 * Do two wizard rules (as token arrays, including the leading state token)
 * read the same configuration? `\varepsilon` is a wildcard in a read position,
 * so it overlaps with everything.
 *
 * Used to reject an ambiguous rule while it is being added, instead of letting
 * the build fail later with a less obvious message.
 */
export function wizardRulesOverlap(a: string[], b: string[], nStacks: number) {
  if (a[0] !== b[0]) return false;
  for (let i = 1; i <= nStacks + 1; i += 1) {
    const x = a[i];
    const y = b[i];
    const wildcard = x === '\\varepsilon' || y === '\\varepsilon';
    if (!wildcard && x !== y) return false;
  }
  return true;
}
