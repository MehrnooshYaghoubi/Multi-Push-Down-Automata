/**
 * All IPC handlers live here, registered once from `main.ts`.
 *
 * Each handler returns a `Result`, so a bad program or a bad input word comes
 * back to the renderer as a message the UI can show instead of dying in the
 * main process (which is what happened before — `AUTOMATON_MODEL.execute()`
 * throws on ambiguous rules and nothing was listening).
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { Automaton } from '../core/automaton';
import type { MachineConfig, MachineInfo } from '../core/types';
import { setupToConfig, type WizardSetup } from '../shared/wizard';
import type { ExampleSummary, Result } from '../shared/ipc';
import { examplesPath, workingConfigPath } from './paths';

const machine = new Automaton(1);

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (e: unknown): Result<never> => ({
  ok: false,
  error: e instanceof Error ? e.message : String(e),
});

/** Run a handler, turning any throw into a `Result` the renderer can render. */
function guard<A extends unknown[], T>(fn: (...args: A) => T) {
  return (...args: A): Result<T> => {
    try {
      return ok(fn(...args));
    } catch (e) {
      return fail(e);
    }
  };
}

function info(): MachineInfo {
  return machine.getInfo();
}

/** Remember the current machine so it survives a restart. */
function persist() {
  try {
    writeFileSync(workingConfigPath(), machine.save(), 'utf-8');
  } catch {
    // Not being able to cache the machine must never break the session.
  }
}

/** Restore the last machine the user worked on, if there is one. */
export function loadLastSession() {
  try {
    machine.restore(readFileSync(workingConfigPath(), 'utf-8'));
  } catch {
    // No previous session (or an unreadable one) — start empty.
  }
}

function readConfigFile(file: string): MachineConfig {
  return JSON.parse(readFileSync(file, 'utf-8')) as MachineConfig;
}

function listExamples(): ExampleSummary[] {
  const dir = examplesPath();
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((file) => {
      const id = path.basename(file, '.json');
      try {
        const config = readConfigFile(path.join(dir, file));
        return {
          id,
          name: config.name ?? id,
          lang: config.lang ?? '',
          stacks: config.stacks ?? 1,
          alphabet: config.alphabet ?? [],
          samples: config.samples ?? [],
        };
      } catch {
        return null;
      }
    })
    .filter((e): e is ExampleSummary => e !== null)
    .sort((a, b) => a.stacks - b.stacks || a.name.localeCompare(b.name));
}

export default function registerIpcHandlers() {
  ipcMain.handle(
    'get_info_from_machine',
    guard(() => info()),
  );

  ipcMain.handle(
    'machine_build',
    guard((_e, setup: WizardSetup) => {
      machine.restore(setupToConfig(setup));
      persist();
      return info();
    }),
  );

  ipcMain.handle(
    'machine_load',
    guard((_e, file: string) => {
      machine.restore(readFileSync(file, 'utf-8'));
      persist();
      return info();
    }),
  );

  ipcMain.handle(
    'machine_load_example',
    guard((_e, id: string) => {
      // Guard against `..` so a crafted id can't read outside the library.
      const file = examplesPath(`${path.basename(String(id))}.json`);
      machine.restore(readFileSync(file, 'utf-8'));
      persist();
      return info();
    }),
  );

  ipcMain.handle(
    'machine_set_input',
    guard((_e, word: string) => {
      machine.resetExec();
      machine.setQueue(String(word ?? ''));
      return info();
    }),
  );

  ipcMain.handle(
    'machine_step',
    guard(() => {
      machine.step();
      return info();
    }),
  );

  ipcMain.handle(
    'machine_run',
    guard(() => {
      machine.run();
      return info();
    }),
  );

  ipcMain.handle(
    'machine_reset',
    guard(() => {
      machine.resetExec();
      return info();
    }),
  );

  ipcMain.handle('list_examples', guard(listExamples));

  ipcMain.handle('machine_save', async (): Promise<Result<string | null>> => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save your machine',
        defaultPath: 'machine.json',
        buttonLabel: 'Save',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (canceled || !filePath) return ok(null);
      writeFileSync(filePath, machine.save(), 'utf-8');
      return ok(filePath);
    } catch (e) {
      return fail(e);
    }
  });

  // Window chrome. Registered once here rather than per window, which used to
  // stack up a new listener every time a window was created.
  ipcMain.on('window-control', (event, action: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    switch (action) {
      case 'minimize':
        win.minimize();
        break;
      case 'maximize':
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
        break;
      case 'close':
        win.close();
        break;
      default:
        break;
    }
  });
}

export { machine };
