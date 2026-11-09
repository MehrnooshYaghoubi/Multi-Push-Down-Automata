/** Pure helpers for showing a machine. */
import { EMPTY, EPSILON, FINAL, type Rule, type Sym } from '../../core/types';

export function symbolToLatex(s: Sym): string {
  if (s === EPSILON) return '\\varepsilon';
  if (s === EMPTY) return '?';
  return String(s);
}

export function stateToLatex(id: number): string {
  return id === FINAL ? 'q_f' : `q_{${id}}`;
}

/**
 * `\delta(q_0, a, \varepsilon) = (q_1, A)`
 *
 * Pure — the previous version rewrote `rule.X` and `rule.q` in place while
 * rendering, which corrupted the state list it was reading from.
 */
export function ruleToLatex(stateId: number, rule: Rule): string {
  const read = [rule.X, ...rule.Y].map(symbolToLatex).join(',');
  const write = rule.W.map(symbolToLatex).join(',');
  return `\\delta(${stateToLatex(stateId)},${read})=(${stateToLatex(rule.q)}${
    write ? `,${write}` : ''
  })`;
}

/** Does this rule fire in the given configuration? Mirrors the model. */
export function ruleMatches(rule: Rule, head: Sym, tops: Sym[]): boolean {
  if (rule.X !== EPSILON && rule.X !== head) return false;
  return rule.Y.every((y, i) => y === EPSILON || y === tops[i]);
}

/** The input symbol under the head, or `?` once the input is exhausted. */
export function headSymbol(remaining: Sym[]): Sym {
  return remaining.length === 0 ? EMPTY : remaining[0];
}

export function stackTops(stacks: Sym[][]): Sym[] {
  return stacks.map((s) => (s.length === 0 ? EMPTY : s[s.length - 1]));
}
