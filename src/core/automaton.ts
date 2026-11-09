/* `State` is an implementation detail of `Automaton`, so they share a file. */
/* eslint-disable max-classes-per-file */
/**
 * Multi-pushdown automaton (the "model" half of the app).
 *
 * A machine is a set of states, each holding a list of rules of the shape
 *
 *     δ(q, X, Y₁..Yₙ) = (q', W₁..Wₙ)
 *
 * where `X` is the symbol read from the input, `Yᵢ` the symbol popped from
 * stack `i` and `Wᵢ` the symbol pushed onto it. `ε` (-1) means "don't care /
 * write nothing" and `?` (-2) means "the slot is empty".
 *
 * The machine is deterministic: if two rules of a state can fire in the same
 * configuration that is reported as an error rather than explored.
 */
import {
  EMPTY,
  EPSILON,
  FINAL,
  REJECT,
  type MachineConfig,
  type MachineInfo,
  type Rule,
  type StateSnapshot,
  type Sym,
} from './types';

/** Upper bound on `run()` so a cyclic ε-rule can never hang the process. */
const MAX_STEPS = 100_000;

class State {
  id = 0;

  rules: Rule[] = [];

  constructor(id = 0) {
    this.id = id;
  }
}

export class Automaton {
  /** Input alphabet (Σ). */
  private alphabet: string[] = [];

  /** Stack alphabet (Γ / V). */
  private auxAlphabet: string[] = [];

  /** The remaining input. */
  private input: Sym[] = [];

  /** How many input symbols have been consumed so far. */
  private consumed = 0;

  /** The stacks; the top of each stack is its last element. */
  private stacks: Sym[][] = [];

  private nStacks = 1;

  private states: State[] = [];

  private current = 0;

  private previous: number | undefined;

  private lang = '';

  constructor(numberOfStacks = 1) {
    this.init(numberOfStacks);
  }

  // ---------------------------------------------------------------- lifecycle

  init(numberOfStacks: unknown = 1) {
    const n =
      typeof numberOfStacks === 'number' && Number.isFinite(numberOfStacks)
        ? Math.max(1, Math.min(10, Math.trunc(numberOfStacks)))
        : 1;
    this.alphabet = [];
    this.auxAlphabet = [];
    this.states = [new State(0)];
    this.current = 0;
    this.previous = undefined;
    this.input = [];
    this.consumed = 0;
    this.nStacks = n;
    this.stacks = Array.from({ length: n }, () => [] as Sym[]);
  }

  /** Clear the input and every stack and go back to q₀. */
  resetExec() {
    this.current = 0;
    this.previous = undefined;
    this.input = [];
    this.consumed = 0;
    this.stacks = Array.from({ length: this.nStacks }, () => [] as Sym[]);
  }

  // ---------------------------------------------------------------- alphabets

  addToAlphabet(symbol: string) {
    if (typeof symbol !== 'string') {
      throw new Error(`Expecting string instead of ${typeof symbol}`);
    }
    if (symbol === '') return;
    if (this.auxAlphabet.includes(symbol)) {
      throw new Error(
        `Can't add "${symbol}" to Σ: Γ already contains that symbol.`,
      );
    }
    if (!this.alphabet.includes(symbol)) this.alphabet.push(symbol);
  }

  addToAuxAlphabet(symbol: string) {
    if (typeof symbol !== 'string') {
      throw new Error(`Expecting string instead of ${typeof symbol}`);
    }
    if (symbol === '') return;
    if (this.alphabet.includes(symbol)) {
      throw new Error(
        `Can't add "${symbol}" to Γ: Σ already contains that symbol.`,
      );
    }
    if (!this.auxAlphabet.includes(symbol)) this.auxAlphabet.push(symbol);
  }

  removeFromAlphabet(symbol: string) {
    const i = this.alphabet.indexOf(symbol);
    if (i !== -1) this.alphabet.splice(i, 1);
  }

  removeFromAuxAlphabet(symbol: string) {
    const i = this.auxAlphabet.indexOf(symbol);
    if (i !== -1) this.auxAlphabet.splice(i, 1);
  }

  getAlphabet() {
    return this.alphabet.slice();
  }

  getAuxAlphabet() {
    return this.auxAlphabet.slice();
  }

  // -------------------------------------------------------------------- input

  /**
   * Load a word onto the input tape. Unlike the previous implementation this
   * refuses symbols outside Σ instead of silently dropping them, so the UI can
   * tell the user why their word did not run.
   */
  setQueue(word: Sym[] | string) {
    const symbols = typeof word === 'string' ? word.split('') : word;
    const unknown = symbols.filter(
      (s) => typeof s !== 'string' || !this.alphabet.includes(s),
    );
    if (unknown.length > 0) {
      throw new Error(
        `Symbol${unknown.length > 1 ? 's' : ''} "${unknown.join(
          '", "',
        )}" ${unknown.length > 1 ? 'are' : 'is'} not in the alphabet Σ.`,
      );
    }
    this.input = symbols.slice();
    this.consumed = 0;
  }

  getQueue() {
    return this.input.slice();
  }

  getConsumed() {
    return this.consumed;
  }

  // ------------------------------------------------------------------- stacks

  getStack(index: number) {
    return this.stacks[index] ? this.stacks[index].slice() : [];
  }

  getStacks() {
    return this.stacks.map((s) => s.slice());
  }

  getStackNumber() {
    return this.nStacks;
  }

  // ------------------------------------------------------------------- states

  getStates(): StateSnapshot[] {
    return this.states.map((s) => ({
      id: s.id,
      rules: s.rules.map((r) => ({ ...r, Y: r.Y.slice(), W: r.W.slice() })),
    }));
  }

  newState() {
    const state = new State(this.states.length);
    this.states.push(state);
    return state;
  }

  removeState(index: number) {
    if (typeof index !== 'number') {
      throw new Error(`Expecting number instead of ${typeof index}`);
    }
    const incoming = this.states.some(
      (s, i) => i !== index && s.rules.some((r) => r.q === index),
    );
    if (incoming) {
      throw new Error(
        "You can't delete a state while there are other states with rules pointing to it.",
      );
    }
    this.states.forEach((s, i) => {
      if (i === index) return;
      s.rules.forEach((r) => {
        if (r.q > index) r.q -= 1;
      });
    });
    this.states.splice(index, 1);
    this.states.forEach((s, i) => {
      s.id = i;
    });
  }

  getCurrentState() {
    return this.current;
  }

  getPreviousState() {
    return this.previous;
  }

  // -------------------------------------------------------------------- rules

  /**
   * @param s source state id
   * @param x symbol read from the input
   * @param y symbols popped from the stacks
   * @param w symbols pushed onto the stacks
   * @param d destination state id (or FINAL)
   */
  addStateRule(s: number, x: Sym, y: Sym[], w: Sym[], d: number) {
    const state = this.states[s];
    if (!state) throw new Error(`Undefined state q${s}`);
    this.addRule(state, d, x, y, w);
  }

  removeStateRule(state: number, index: number) {
    const s = this.states[state];
    if (s && s.rules[index]) s.rules.splice(index, 1);
  }

  private addRule(state: State, d: number, x: Sym, y: Sym[], w: Sym[]) {
    const dest = Automaton.toStateId(d);
    if (dest !== FINAL && (dest < 0 || dest >= this.states.length)) {
      throw new Error(`Rule on q${state.id} points to an undefined state.`);
    }

    const rule: Rule = {
      q: dest,
      X: Automaton.toSymbol(x),
      Y: [],
      W: [],
    };
    for (let i = 0; i < this.nStacks; i += 1) {
      rule.Y[i] = Automaton.toSymbol(y ? y[i] : EPSILON);
      rule.W[i] = Automaton.toSymbol(w ? w[i] : EPSILON);
    }

    if (rule.X === EPSILON && rule.Y.every((s) => s === EPSILON)) {
      throw new Error(`Rule on q${state.id} can't be fully generic.`);
    }

    const clash = state.rules.find((existing) =>
      Automaton.rulesOverlap(existing, rule),
    );
    if (clash) {
      throw new Error(
        `Ambiguous rules on q${state.id}: two rules can fire on the same input.`,
      );
    }

    state.rules.push(rule);
  }

  /**
   * True when both rules could fire in the same configuration — `ε` in a read
   * position is a wildcard, so it overlaps with every other symbol.
   */
  private static rulesOverlap(a: Rule, b: Rule) {
    const compatible = (x: Sym, y: Sym) =>
      x === EPSILON || y === EPSILON || x === y;
    if (!compatible(a.X, b.X)) return false;
    for (let i = 0; i < Math.max(a.Y.length, b.Y.length); i += 1) {
      if (!compatible(a.Y[i] ?? EPSILON, b.Y[i] ?? EPSILON)) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- execution

  /** Rule indexes of the current state that match the current configuration. */
  private nextRules(state: State): number[] {
    const head: Sym = this.input.length === 0 ? EMPTY : this.input[0];
    const tops: Sym[] = this.stacks.map((s) =>
      s.length === 0 ? EMPTY : s[s.length - 1],
    );

    const matches: number[] = [];
    state.rules.forEach((rule, index) => {
      if (rule.X !== EPSILON && rule.X !== head) return;
      for (let i = 0; i < rule.Y.length; i += 1) {
        if (rule.Y[i] !== EPSILON && rule.Y[i] !== tops[i]) return;
      }
      matches.push(index);
    });
    return matches;
  }

  /** Apply the single rule that fits, and return the destination state. */
  private execute(state: State): number {
    const matches = this.nextRules(state);
    if (matches.length === 0) return REJECT;
    if (matches.length > 1) {
      throw new Error(
        `Ambiguous rules on q${state.id}: ${matches.length} rules match the current configuration.`,
      );
    }

    const rule = state.rules[matches[0]];
    if (rule.X !== EPSILON && rule.X !== EMPTY) {
      this.input = this.input.slice(1);
      this.consumed += 1;
    }
    for (let i = 0; i < this.stacks.length; i += 1) {
      if (rule.Y[i] !== EPSILON && rule.Y[i] !== EMPTY) this.stacks[i].pop();
      // `?` in a write position means "write nothing", same as ε.
      if (rule.W[i] !== EPSILON && rule.W[i] !== EMPTY) {
        this.stacks[i].push(rule.W[i]);
      }
    }
    return rule.q;
  }

  /** Run one transition. Returns the new state id (or FINAL / REJECT). */
  step(): number {
    const state = this.states[this.current];
    if (!state) return this.current;
    this.previous = this.current;
    this.current = this.execute(state);
    return this.current;
  }

  /** Run until the machine halts. Returns true when the word is accepted. */
  run(): boolean {
    let steps = 0;
    while (this.states[this.current]) {
      this.step();
      steps += 1;
      if (steps >= MAX_STEPS) {
        throw new Error(
          `The machine did not halt after ${MAX_STEPS} steps — check for a cycle of ε-rules.`,
        );
      }
    }
    return this.current === FINAL;
  }

  isAccepted() {
    return this.current === FINAL;
  }

  isRejected() {
    return this.current === REJECT;
  }

  // ------------------------------------------------------------------ metadata

  setLang(lang: string) {
    this.lang = typeof lang === 'string' ? lang : '';
  }

  getLang() {
    return this.lang;
  }

  /** Everything the renderer needs to draw the machine, in one object. */
  getInfo(): MachineInfo {
    return {
      alpha: this.getAlphabet(),
      auxAlpha: this.getAuxAlphabet(),
      queues: this.getQueue(),
      stacks: this.getStacks(),
      states: this.getStates(),
      current_state: this.current,
      previous_state: this.previous,
      numOfStacks: this.nStacks,
      lang: this.lang,
      consumed: this.consumed,
      accepted: this.isAccepted(),
      rejected: this.isRejected(),
    };
  }

  // ------------------------------------------------------- save / restore

  toConfig(): MachineConfig {
    return {
      stacks: this.nStacks,
      alphabet: this.getAlphabet(),
      aux_alphabet: this.getAuxAlphabet(),
      states: this.getStates(),
      lang: this.lang,
    };
  }

  save() {
    return JSON.stringify(this.toConfig(), null, 2);
  }

  /** Rebuild the machine from JSON produced by `save()` (or an example file). */
  restore(json: string | MachineConfig) {
    let config: MachineConfig;
    if (typeof json === 'string') {
      try {
        config = JSON.parse(json);
      } catch {
        throw new Error('That file is not valid JSON.');
      }
    } else {
      config = json;
    }

    Automaton.validateConfig(config);

    this.init(config.stacks);
    this.setLang(config.lang ?? '');

    const errors: string[] = [];
    config.alphabet.forEach((s) => {
      try {
        this.addToAlphabet(s);
      } catch (e) {
        errors.push((e as Error).message);
      }
    });
    (config.aux_alphabet ?? []).forEach((s) => {
      try {
        this.addToAuxAlphabet(s);
      } catch (e) {
        errors.push((e as Error).message);
      }
    });

    // Every state has to exist before rules are added, otherwise a forward
    // reference looks like a rule pointing at an undefined state.
    this.states = config.states.map((_, i) => new State(i));

    config.states.forEach((snapshot, i) => {
      (snapshot.rules ?? []).forEach((rule) => {
        try {
          this.addRule(this.states[i], rule.q, rule.X, rule.Y, rule.W);
        } catch (e) {
          errors.push((e as Error).message);
        }
      });
    });

    if (errors.length > 0) {
      // Leave the machine in a usable state rather than half-built.
      this.init(config.stacks);
      throw new Error(errors.join('\n'));
    }
  }

  private static validateConfig(
    config: unknown,
  ): asserts config is MachineConfig {
    const c = config as MachineConfig | null;
    if (!c || typeof c !== 'object') {
      throw new Error('Specified program is not valid.');
    }
    if (typeof c.stacks !== 'number' || c.stacks < 1 || c.stacks > 10) {
      throw new Error('"stacks" must be a number between 1 and 10.');
    }
    if (!Array.isArray(c.alphabet) || c.alphabet.length === 0) {
      throw new Error('"alphabet" must be a non-empty list of symbols.');
    }
    if (!Array.isArray(c.states) || c.states.length === 0) {
      throw new Error('"states" must be a non-empty list of states.');
    }
  }

  /** Accept `-1`, `-2`, `"-1"`, `"a"`… and normalise to a `Sym`. */
  private static toSymbol(value: unknown): Sym {
    if (value === undefined || value === null || value === '') return EPSILON;
    if (value === EPSILON || value === EMPTY) return value;
    if (typeof value === 'number') {
      if (value === -1) return EPSILON;
      if (value === -2) return EMPTY;
      return String(value);
    }
    if (typeof value === 'string') {
      if (value === '-1' || value === '\\varepsilon') return EPSILON;
      if (value === '-2' || value === '?') return EMPTY;
      return value;
    }
    return EPSILON;
  }

  /** State ids arrive as numbers or as numeric strings from the wizard. */
  private static toStateId(value: unknown): number {
    if (typeof value === 'number') return Math.trunc(value);
    const n = Number.parseInt(String(value), 10);
    return Number.isNaN(n) ? FINAL : n;
  }
}

/**
 * The single machine instance the main process drives.
 *
 * Kept as a named export (rather than the old IIFE singleton) so the class can
 * also be instantiated on its own in tests.
 */
export const AUTOMATON_MODEL = new Automaton(1);

export default Automaton;
