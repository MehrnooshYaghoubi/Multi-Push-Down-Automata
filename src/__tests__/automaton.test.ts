import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { Automaton } from '../core/automaton';
import type { MachineConfig } from '../core/types';

const examplesDir = path.join(__dirname, '../../assets/examples');

function loadExample(name: string): MachineConfig {
  return JSON.parse(
    readFileSync(path.join(examplesDir, `${name}.json`), 'utf-8'),
  );
}

function accepts(config: MachineConfig, word: string) {
  const machine = new Automaton(config.stacks);
  machine.restore(config);
  machine.setQueue(word);
  return machine.run();
}

describe('example library', () => {
  const files = readdirSync(examplesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.basename(f, '.json'));

  it.each(files)('%s loads without errors', (name) => {
    const machine = new Automaton(1);
    expect(() => machine.restore(loadExample(name))).not.toThrow();
  });

  it.each(files)('%s declares a language and samples', (name) => {
    const config = loadExample(name);
    expect(typeof config.lang).toBe('string');
    expect(config.lang.length).toBeGreaterThan(0);
  });
});

describe('a^n b^n', () => {
  const config = loadExample('anbn');

  it.each(['', 'ab', 'aabb', 'aaaabbbb'])('accepts "%s"', (word) => {
    expect(accepts(config, word)).toBe(true);
  });

  it.each(['a', 'b', 'aab', 'abb', 'ba', 'abab'])('rejects "%s"', (word) => {
    expect(accepts(config, word)).toBe(false);
  });
});

describe('a^n b^n c^n', () => {
  const config = loadExample('anbncn');

  it.each(['', 'abc', 'aabbcc', 'aaabbbccc'])('accepts "%s"', (word) => {
    expect(accepts(config, word)).toBe(true);
  });

  it.each(['ab', 'abcc', 'aabbc', 'acb', 'aabbbccc'])(
    'rejects "%s"',
    (word) => {
      expect(accepts(config, word)).toBe(false);
    },
  );
});

describe('a^n b^n c^n d^n', () => {
  const config = loadExample('anbncndn');

  it.each(['', 'abcd', 'aabbccdd'])('accepts "%s"', (word) => {
    expect(accepts(config, word)).toBe(true);
  });

  it.each(['abc', 'aabbccd', 'abcdd'])('rejects "%s"', (word) => {
    expect(accepts(config, word)).toBe(false);
  });
});

describe('a^n b^2n', () => {
  const config = loadExample('anb2n');

  it.each(['', 'abb', 'aabbbb'])('accepts "%s"', (word) => {
    expect(accepts(config, word)).toBe(true);
  });

  it.each(['ab', 'abbb', 'aabbb'])('rejects "%s"', (word) => {
    expect(accepts(config, word)).toBe(false);
  });
});

describe('w c w^R', () => {
  const config = loadExample('wcwr');

  it.each(['c', 'aca', 'abcba', 'abbcbba'])('accepts "%s"', (word) => {
    expect(accepts(config, word)).toBe(true);
  });

  it.each(['abcab', 'ac', 'abc'])('rejects "%s"', (word) => {
    expect(accepts(config, word)).toBe(false);
  });
});

describe('balanced parentheses', () => {
  const config = loadExample('balanced-parentheses');

  it.each(['', '()', '(())', '(())()'])('accepts "%s"', (word) => {
    expect(accepts(config, word)).toBe(true);
  });

  it.each(['(', ')', '())(', '(()'])('rejects "%s"', (word) => {
    expect(accepts(config, word)).toBe(false);
  });
});

describe('a^n b^m c^n d^m', () => {
  const config = loadExample('anbmcndm');

  it.each(['', 'abcd', 'aabccd', 'aabbccdd', 'aacc', 'bbdd'])(
    'accepts "%s"',
    (word) => {
      expect(accepts(config, word)).toBe(true);
    },
  );

  it.each(['abc', 'aabcdd', 'abdc'])('rejects "%s"', (word) => {
    expect(accepts(config, word)).toBe(false);
  });
});

describe('stepping', () => {
  const config = loadExample('anbn');

  it('consumes one symbol at a time and tracks the head', () => {
    const machine = new Automaton(config.stacks);
    machine.restore(config);
    machine.setQueue('aabb');

    expect(machine.getConsumed()).toBe(0);
    machine.step();
    expect(machine.getConsumed()).toBe(1);
    expect(machine.getStack(0)).toEqual(['A']);
    machine.step();
    expect(machine.getStack(0)).toEqual(['A', 'A']);
    machine.step();
    expect(machine.getStack(0)).toEqual(['A']);
    expect(machine.getCurrentState()).toBe(1);
    machine.step();
    expect(machine.getStack(0)).toEqual([]);
    machine.step();
    expect(machine.isAccepted()).toBe(true);
  });

  it('keeps the top of each stack at the end of the array', () => {
    const machine = new Automaton(config.stacks);
    machine.restore(config);
    machine.setQueue('ab');
    machine.step();
    const stack = machine.getStack(0);
    expect(stack[stack.length - 1]).toBe('A');
  });
});

describe('input validation', () => {
  it('rejects symbols outside the alphabet instead of dropping them', () => {
    const machine = new Automaton(1);
    machine.restore(loadExample('anbn'));
    expect(() => machine.setQueue('axb')).toThrow(/not in the alphabet/);
  });

  it('reports a bad program instead of half-building it', () => {
    const machine = new Automaton(1);
    expect(() => machine.restore('{ not json')).toThrow(/valid JSON/);
    expect(() => machine.restore({} as never)).toThrow();
  });

  it('refuses a fully generic rule', () => {
    const machine = new Automaton(1);
    expect(() =>
      machine.restore({
        stacks: 1,
        alphabet: ['a'],
        aux_alphabet: [],
        lang: 'x',
        states: [{ id: 0, rules: [{ q: 0, X: -1, Y: [-1], W: ['a'] }] }],
      }),
    ).toThrow(/fully generic/);
  });

  it('refuses two rules that read the same configuration', () => {
    const machine = new Automaton(1);
    expect(() =>
      machine.restore({
        stacks: 1,
        alphabet: ['a'],
        aux_alphabet: ['A'],
        lang: 'x',
        states: [
          {
            id: 0,
            rules: [
              { q: 0, X: 'a', Y: [-1], W: ['A'] },
              { q: -1, X: 'a', Y: [-1], W: [-1] },
            ],
          },
        ],
      }),
    ).toThrow(/Ambiguous/);
  });

  it('stops a machine that never halts', () => {
    const machine = new Automaton(1);
    machine.restore({
      stacks: 1,
      alphabet: ['a'],
      aux_alphabet: ['A'],
      lang: 'x',
      // Fires whenever the input is exhausted, consumes nothing, loops.
      states: [{ id: 0, rules: [{ q: 0, X: -2, Y: [-1], W: ['A'] }] }],
    });
    machine.setQueue('');
    expect(() => machine.run()).toThrow(/did not halt/);
  });
});

describe('save / restore', () => {
  it('round-trips a machine', () => {
    const machine = new Automaton(1);
    machine.restore(loadExample('anbncn'));
    const json = machine.save();

    const copy = new Automaton(1);
    copy.restore(json);
    expect(copy.toConfig()).toEqual(machine.toConfig());
  });
});
