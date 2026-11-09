<div align="center">
  <img src="assets/icon.png" alt="Multi Pushdown Automata" width="140" />

  <h1>Multi Pushdown Automata</h1>

  <p><em>An interactive simulator for deterministic automata with an arbitrary number of stacks.</em></p>
</div>

---

## Abstract

**Multi Pushdown Automata** is a desktop application for designing, visualising
and executing *k*-stack pushdown automata. The user defines a machine
— alphabet, stack alphabet, states and transition function — through a guided
six-step form, loads an input word, and then watches the computation unfold one
transition at a time: the tape head advances, the stacks grow and shrink, and
the active state and the rule currently firing are highlighted.

The project was written as a teaching and experimentation tool for a course in
formal languages and automata theory, where the step between *"the definition
on the blackboard"* and *"what the machine actually does"* is the part students
most often lose.

## Theoretical background

A **finite automaton** has no memory beyond its state, and so recognises
exactly the regular languages. Adding a single stack yields the classical
**pushdown automaton (PDA)**, whose language class is precisely the
context-free languages. The stack is a genuine but limited form of memory: it
can be read only at the top, and only in last-in-first-out order. This is why

$$L_1 = \{a^n b^n \mid n \geq 0\}$$

is accepted by a one-stack machine — push on every *a*, pop on every *b* — while

$$L_2 = \{a^n b^n c^n \mid n \geq 0\}$$

is not context-free at all: by the pumping lemma no single stack can keep the
three counters in step.

Give the machine a **second stack**, however, and the picture changes
completely. The classical result is that

> a pushdown automaton with two stacks is equivalent in power to a
> **Turing machine**.

The intuition is a simulation argument: the tape of a Turing machine is split
at the head position, the portion to the left is held (reversed) on one stack
and the portion to the right on the other. Moving the head left or right
becomes "pop from one stack, push onto the other", and reading or rewriting the
current cell becomes an operation on the two tops. Every Turing-machine
transition is therefore reproduced by a constant number of two-stack
transitions, and the two models recognise the same class — the recursively
enumerable languages.

The hierarchy this simulator lets you explore is thus:

| Memory | Model | Language class |
| --- | --- | --- |
| none | finite automaton | regular |
| one stack | pushdown automaton | context-free |
| two stacks | 2-PDA | recursively enumerable (Turing-equivalent) |
| *k* > 2 stacks | *k*-PDA | no further gain in power — but far more natural programs |

Stacks beyond the second buy no additional *theoretical* power, yet they buy a
great deal of *clarity*: `aⁿbⁿcⁿdⁿ` written with three stacks is four short
states, whereas the same language encoded on two stacks is an exercise in
bookkeeping. The simulator therefore allows up to ten stacks and treats the
number of stacks as a parameter of the machine.

### The model implemented here

A machine is a tuple

$$M = \langle \Sigma,\ Q,\ \delta,\ q_0,\ F,\ \Gamma,\ N \rangle$$

with input alphabet Σ, stack alphabet Γ, state set *Q*, initial state *q₀*,
a single accepting state *q_f*, and *N* stacks. The transition function has
the shape

$$\delta(q,\ X,\ Y_1 \ldots Y_N) = (q',\ W_1 \ldots W_N)$$

where *X* is the symbol read from the input, *Yᵢ* the symbol popped from stack
*i*, and *Wᵢ* the symbol pushed onto it. Two markers complete the notation:

- **ε** — read nothing / write nothing. In a *read* position it acts as a
  wildcard and matches whatever happens to be there.
- **?** — the slot is empty: the input is exhausted, or the stack has no top.

The implementation is **deterministic**. At most one rule of a state may match
any given configuration; if two rules could fire simultaneously the machine
reports an ambiguity rather than silently choosing a branch. A word is
**accepted** when the computation reaches *q_f*, and **rejected** when it halts
in any other state — that is, when no rule applies.

## The example library

The folder [`assets/examples`](assets/examples) ships a set of classical
languages, each one a small JSON file that the application lists under
**Examples** on the start screen:

| Language | Stacks | File |
| --- | --- | --- |
| aⁿbⁿ | 1 | `anbn.json` |
| aⁿb²ⁿ | 1 | `anb2n.json` |
| w c wᴿ (marked palindromes) | 1 | `wcwr.json` |
| balanced parentheses | 1 | `balanced-parentheses.json` |
| aⁿbⁿcⁿ | 2 | `anbncn.json` |
| aⁿbᵐcⁿdᵐ (crossed dependencies) | 2 | `anbmcndm.json` |
| aⁿbⁿcⁿdⁿ | 3 | `anbncndn.json` |

The first four are context-free and need a single stack; the last three are
not, and are exactly the cases where the extra stacks earn their keep.
Dropping a new JSON file into that folder is enough to add it to the list —
the format is documented in [`assets/examples/README.md`](assets/examples/README.md).

## Running the project

The application is built with Electron, React and TypeScript.

**Requirements:** Node.js 18 or newer and npm.

```bash
# 1. install dependencies
npm install

# 2. start the app in development mode (hot reload)
npm start
```

Further scripts:

```bash
npm test         # run the test suite (automaton semantics + every example language)
npm run lint     # ESLint over the whole project
npm run build    # production bundles for the main and renderer processes
npm run package  # build a distributable for the current platform (release/build)
```

If port `1212` is already taken by a previous session, start with
`PORT=4343 npm start`.

## Using the application

1. **Start** opens the six-step wizard: number of stacks → Σ → Γ → *Q* →
   δ → the language being recognised (written in LaTeX, e.g.
   `\{a^n b^n \mid n \geq 0\}`).
2. **Examples** loads one of the machines above, ready to run.
3. **Load** opens a machine previously written to disk; **Save** writes the
   current one back out as JSON.
4. On the execution screen, type a word, press **Set**, then **Step** through
   the computation or **Run** it to completion. The tape head marks the next
   symbol to be read, each stack is drawn with its top at the top, and the rule
   about to fire is highlighted in the active state.

## Project structure

```
src/
  core/        the automaton itself — pure TypeScript, no Electron, no React
    automaton.ts   states, rules, stacks, stepping, save/restore
    types.ts       the shared vocabulary (Sym, Rule, MachineConfig, …)
  main/        the Electron main process
    main.ts        window lifecycle
    ipc.ts         every IPC handler, each returning { ok, data | error }
    paths.ts       dev vs. packaged file locations
    preload.ts     the context bridge, with an explicit channel whitelist
  shared/      code used on both sides of the bridge
    ipc.ts         channel names and payload types
    wizard.ts      wizard form  →  machine configuration
  renderer/    the user interface
    pages/         Home, Variables (the wizard), Execution
    components/    TitleBar, StateCard, Stack, Item, FlashMessage, …
    lib/           typed IPC client, LaTeX formatting, background particles
    styles/        CSS
  __tests__/   unit tests
assets/
  examples/    the language library
```

The separation is deliberate: `src/core` knows nothing about Electron or React,
so the semantics of the machine can be tested directly — `npm test` runs every
example language against dozens of accepted and rejected words.

## License

MIT — see [LICENSE](LICENSE).

Made by **Mehrnoosh Yaghoubi Kalurazi**.
