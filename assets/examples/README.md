# Example language library

Every file in this folder is a ready-made machine that the app lists under
**Examples** on the start screen. They are plain JSON, so you can copy one,
edit it and drop it back in here — it shows up the next time the app starts.

| File | Language | Stacks |
| --- | --- | --- |
| `anbn.json` | aⁿbⁿ | 1 |
| `anb2n.json` | aⁿb²ⁿ | 1 |
| `wcwr.json` | w c wᴿ | 1 |
| `balanced-parentheses.json` | balanced parentheses | 1 |
| `anbncn.json` | aⁿbⁿcⁿ | 2 |
| `anbmcndm.json` | aⁿbᵐcⁿdᵐ | 2 |
| `anbncndn.json` | aⁿbⁿcⁿdⁿ | 3 |

## Format

```jsonc
{
  "name": "a^n b^n",                       // shown in the Examples list
  "lang": "\\{a^n b^n \\mid n \\geq 0\\}", // LaTeX, shown while running
  "samples": ["", "ab", "aabb"],           // one-click test words
  "stacks": 1,
  "alphabet": ["a", "b"],                  // Σ
  "aux_alphabet": ["A"],                   // Γ, must be disjoint from Σ
  "states": [
    {
      "id": 0,
      "rules": [
        // δ(q0, a, ε) = (q0, A)   — read `a`, push `A`, stay in q0
        { "q": 0, "X": "a", "Y": [-1], "W": ["A"] }
      ]
    }
  ]
}
```

- `X` is the symbol read from the input, `Y[i]` the symbol popped from stack
  `i`, `W[i]` the symbol pushed onto it, and `q` the destination state.
- `-1` is **ε**: read nothing / write nothing. In a read position it is a
  wildcard, so it matches whatever is there.
- `-2` is **?**: the slot is empty (end of input, or bottom of a stack).
- `"q": -1` is the accepting state *q_f*.

The machine is deterministic: at most one rule of a state may match any given
configuration, otherwise the app reports an ambiguity instead of guessing.

`name` and `samples` are optional; the other fields are required.
