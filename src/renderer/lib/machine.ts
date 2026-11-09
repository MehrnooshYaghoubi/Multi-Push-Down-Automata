/**
 * Thin typed wrapper around the IPC bridge.
 *
 * Every call resolves to `{ ok, data | error }`; these helpers unwrap that so a
 * page can `try { await machine.step() } catch (e) { showFlash(e.message) }`.
 */
import type { MachineInfo } from '../../core/types';
import type { ExampleSummary, InvokeChannel } from '../../shared/ipc';

async function call<T>(channel: InvokeChannel, ...args: unknown[]): Promise<T> {
  const result = await window.electron.ipcRenderer.invoke<T>(channel, ...args);
  if (!result || !result.ok) {
    throw new Error(result?.error ?? 'The machine did not answer.');
  }
  return result.data;
}

export const machine = {
  info: () => call<MachineInfo>('get_info_from_machine'),
  build: (setup: unknown) => call<MachineInfo>('machine_build', setup),
  load: (filePath: string) => call<MachineInfo>('machine_load', filePath),
  loadExample: (id: string) => call<MachineInfo>('machine_load_example', id),
  setInput: (word: string) => call<MachineInfo>('machine_set_input', word),
  step: () => call<MachineInfo>('machine_step'),
  run: () => call<MachineInfo>('machine_run'),
  reset: () => call<MachineInfo>('machine_reset'),
  save: () => call<string | null>('machine_save'),
  examples: () => call<ExampleSummary[]>('list_examples'),
};

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export default machine;
