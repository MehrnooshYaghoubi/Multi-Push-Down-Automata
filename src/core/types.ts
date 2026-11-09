/** Shared automaton types, used by both the main process and the renderer. */

/** Read/write nothing. */
export const EPSILON = -1;
/** Read "the empty slot" (bottom of a stack / end of the input). */
export const EMPTY = -2;
/** The accepting state. */
export const FINAL = -1;
/** The machine stopped without accepting. */
export const REJECT = -2;

/** A tape/stack symbol: a real character, or one of the two markers above. */
export type Sym = string | -1 | -2;

export interface Rule {
  /** Destination state id, or FINAL. */
  q: number;
  /** Symbol read from the input. */
  X: Sym;
  /** Symbol read (popped) from each stack. */
  Y: Sym[];
  /** Symbol written (pushed) to each stack. */
  W: Sym[];
}

export interface StateSnapshot {
  id: number;
  rules: Rule[];
}

/** The JSON shape of a saved machine — also the format of assets/examples/*.json. */
export interface MachineConfig {
  stacks: number;
  alphabet: string[];
  aux_alphabet: string[];
  states: StateSnapshot[];
  lang: string;
  /** Optional human readable name, used by the example library. */
  name?: string;
  /** Optional sample words, used by the example library. */
  samples?: string[];
}

export interface MachineInfo {
  alpha: string[];
  auxAlpha: string[];
  queues: Sym[];
  stacks: Sym[][];
  states: StateSnapshot[];
  current_state: number;
  previous_state: number | undefined;
  numOfStacks: number;
  lang: string;
  /** Number of input symbols already consumed — i.e. the tape head position. */
  consumed: number;
  accepted: boolean;
  rejected: boolean;
}
