/**
 * End-to-end-ish test of the renderer: the real `Automaton` sits behind a fake
 * IPC bridge, exactly like the main process wires it in `src/main/ipc.ts`, and
 * the UI is driven through the same clicks a user would make.
 */
import '@testing-library/jest-dom';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import App from '../renderer/App';
import { Automaton } from '../core/automaton';

const examplesDir = path.join(__dirname, '../../assets/examples');

let machine: Automaton;

function fakeInvoke(channel: string, ...args: unknown[]) {
  const ok = (data: unknown) => ({ ok: true, data });
  try {
    switch (channel) {
      case 'get_info_from_machine':
        return ok(machine.getInfo());
      case 'list_examples':
        return ok(
          readdirSync(examplesDir)
            .filter((f) => f.endsWith('.json'))
            .map((f) => {
              const c = JSON.parse(
                readFileSync(path.join(examplesDir, f), 'utf-8'),
              );
              return {
                id: path.basename(f, '.json'),
                name: c.name,
                lang: c.lang,
                stacks: c.stacks,
                alphabet: c.alphabet,
                samples: c.samples ?? [],
              };
            })
            .sort(
              (a, b) => a.stacks - b.stacks || a.name.localeCompare(b.name),
            ),
        );
      case 'machine_load_example':
        machine.restore(
          readFileSync(path.join(examplesDir, `${args[0]}.json`), 'utf-8'),
        );
        return ok(machine.getInfo());
      case 'machine_set_input':
        machine.resetExec();
        machine.setQueue(String(args[0] ?? ''));
        return ok(machine.getInfo());
      case 'machine_step':
        machine.step();
        return ok(machine.getInfo());
      case 'machine_run':
        machine.run();
        return ok(machine.getInfo());
      case 'machine_reset':
        machine.resetExec();
        return ok(machine.getInfo());
      default:
        return ok(undefined);
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

beforeEach(() => {
  machine = new Automaton(1);
  (window as unknown as Record<string, unknown>).electron = {
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn(() => () => {}),
      once: jest.fn(),
      invoke: jest.fn(async (channel: string, ...args: unknown[]) =>
        fakeInvoke(channel, ...args),
      ),
    },
    controlWindow: jest.fn(),
  };
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

/** Home → Examples → pick a language → execution screen. */
async function openExample(name: string) {
  const view = render(<App />);
  fireEvent.click(await view.findByText('Examples'));
  fireEvent.click(await view.findByText(name));
  await view.findByText('Input String');
  return view;
}

async function runWord(view: ReturnType<typeof render>, word: string) {
  const input = view.container.querySelector(
    '#inputString',
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { value: word } });
  await act(async () => {
    fireEvent.click(view.getByDisplayValue('Set'));
  });
  await act(async () => {
    fireEvent.click(view.getByText('Run'));
  });
}

describe('loading an example and running it', () => {
  it('lists the example library', async () => {
    const view = render(<App />);
    fireEvent.click(await view.findByText('Examples'));
    expect(await view.findByText('a^n b^n c^n')).toBeInTheDocument();
    expect(await view.findByText('Balanced parentheses')).toBeInTheDocument();
  });

  it('accepts a word in a^n b^n c^n', async () => {
    const view = await openExample('a^n b^n c^n');
    await runWord(view, 'aabbcc');
    await waitFor(() => expect(view.getByText('Accepted')).toBeInTheDocument());
  });

  it('rejects a word outside the language', async () => {
    const view = await openExample('a^n b^n c^n');
    await runWord(view, 'aabbc');
    await waitFor(() => expect(view.getByText('Rejected')).toBeInTheDocument());
  });

  it('reports an input symbol that is not in the alphabet', async () => {
    const view = await openExample('a^n b^n');
    await runWord(view, 'axb');
    await waitFor(
      () => expect(view.getByText(/not in the alphabet/)).toBeInTheDocument(),
      { timeout: 10000 },
    );
  });

  it('advances the tape head one symbol per step', async () => {
    const view = await openExample('a^n b^n');
    const input = view.container.querySelector(
      '#inputString',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ab' } });
    await act(async () => {
      fireEvent.click(view.getByDisplayValue('Set'));
    });

    const headText = () =>
      view.container.querySelector('.inputString .tapeHead')?.textContent;
    await waitFor(() => expect(headText()).toBe('a'));

    await act(async () => {
      fireEvent.click(view.getByText('Step'));
    });
    await waitFor(() => expect(headText()).toBe('b'));
  });

  it('draws the top of the stack at the top of the column', async () => {
    const view = await openExample('w c w^R');
    const input = view.container.querySelector(
      '#inputString',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abcba' } });
    await act(async () => {
      fireEvent.click(view.getByDisplayValue('Set'));
    });
    // Push A then B; B is the top, so it must be the first cell drawn.
    await act(async () => {
      fireEvent.click(view.getByText('Step'));
    });
    await act(async () => {
      fireEvent.click(view.getByText('Step'));
    });

    const cells = Array.from(
      view.container.querySelectorAll('.stackBody > div'),
    ).map((c) => (c as HTMLElement).textContent);
    expect(cells[0]).toBe('B');
    expect(cells[1]).toBe('A');
    expect(
      view.container.querySelector('.stackBody .stackHead')?.textContent,
    ).toBe('B');
  });
});
