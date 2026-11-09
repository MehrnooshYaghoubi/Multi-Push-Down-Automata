import { Automaton } from '../core/automaton';
import {
  setupToConfig,
  wizardRulesOverlap,
  type WizardSetup,
} from '../shared/wizard';

/** The wizard's own description of a^n b^n, one stack. */
const anbn: WizardSetup = {
  numOfStacks: 1,
  Alphabet: ['a', 'b'],
  StackAlphabet: ['A'],
  States: ['q_{0}', 'q_{1}'],
  ProgramFunction: [
    ['q_{0}', 'a', '\\varepsilon', 'q_{0}', 'A'],
    ['q_{0}', 'b', 'A', 'q_{1}', '\\varepsilon'],
    ['q_{0}', '?', '?', 'q_f', '\\varepsilon'],
    ['q_{1}', 'b', 'A', 'q_{1}', '\\varepsilon'],
    ['q_{1}', '?', '?', 'q_f', '\\varepsilon'],
  ],
  Langauge: '\\{a^n b^n\\}',
};

describe('setupToConfig', () => {
  it('keeps every rule with its own state', () => {
    const config = setupToConfig(anbn);
    expect(config.states).toHaveLength(2);
    expect(config.states[0].rules).toHaveLength(3);
    expect(config.states[1].rules).toHaveLength(2);
  });

  it('does not mutate the wizard data (so the user can go back and edit)', () => {
    const before = JSON.stringify(anbn);
    setupToConfig(anbn);
    expect(JSON.stringify(anbn)).toBe(before);
  });

  it('turns tokens into the model representation', () => {
    const config = setupToConfig(anbn);
    expect(config.states[0].rules[0]).toEqual({
      q: 0,
      X: 'a',
      Y: [-1],
      W: ['A'],
    });
    // `q_f` is the accepting state, `?` is "the slot is empty".
    expect(config.states[0].rules[2]).toEqual({
      q: -1,
      X: -2,
      Y: [-2],
      W: [-1],
    });
  });

  it('produces a machine that actually runs', () => {
    const machine = new Automaton(1);
    machine.restore(setupToConfig(anbn));
    machine.setQueue('aabb');
    expect(machine.run()).toBe(true);
    machine.resetExec();
    machine.setQueue('aab');
    expect(machine.run()).toBe(false);
  });

  it('builds a two-stack machine with the right rule arity', () => {
    const config = setupToConfig({
      numOfStacks: 2,
      Alphabet: ['a'],
      StackAlphabet: ['A', 'B'],
      States: ['q_{0}'],
      ProgramFunction: [
        ['q_{0}', 'a', '\\varepsilon', '\\varepsilon', 'q_{0}', 'A', 'B'],
      ],
      Langauge: 'x',
    });
    expect(config.states[0].rules[0]).toEqual({
      q: 0,
      X: 'a',
      Y: [-1, -1],
      W: ['A', 'B'],
    });
  });
});

describe('wizardRulesOverlap', () => {
  const a = ['q_{0}', 'a', '\\varepsilon'];

  it('spots a duplicate read pattern', () => {
    expect(wizardRulesOverlap(a, ['q_{0}', 'a', 'A'], 1)).toBe(true);
  });

  it('allows rules that read different symbols', () => {
    expect(wizardRulesOverlap(a, ['q_{0}', 'b', 'A'], 1)).toBe(false);
  });

  it('ignores rules of other states', () => {
    expect(wizardRulesOverlap(a, ['q_{1}', 'a', '\\varepsilon'], 1)).toBe(
      false,
    );
  });
});
