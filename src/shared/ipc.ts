/** The complete list of IPC channels, shared by the preload and the renderer. */

/** Renderer → main, fire and forget. */
export const SEND_CHANNELS = ['window-control'] as const;

/**
 * Renderer → main, awaits a reply.
 *
 * Every machine operation lives here rather than on a fire-and-forget channel:
 * the old code sent `machine_step` and then immediately asked for the new
 * state, which raced, and errors thrown in the main process were lost.
 */
export const INVOKE_CHANNELS = [
  'get_info_from_machine',
  'machine_build',
  'machine_load',
  'machine_load_example',
  'machine_save',
  'machine_set_input',
  'machine_step',
  'machine_run',
  'machine_reset',
  'list_examples',
] as const;

/** Main → renderer. */
export const RECEIVE_CHANNELS = ['machine_error'] as const;

export type SendChannel = (typeof SEND_CHANNELS)[number];
export type InvokeChannel = (typeof INVOKE_CHANNELS)[number];
export type ReceiveChannel = (typeof RECEIVE_CHANNELS)[number];
export type Channels = SendChannel | InvokeChannel | ReceiveChannel;

/** Every `invoke` resolves to this, so the renderer never has to guess. */
export type Result<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface ExampleSummary {
  /** File name without the extension, used to load it back. */
  id: string;
  /** Human readable name. */
  name: string;
  /** LaTeX description of the language. */
  lang: string;
  stacks: number;
  alphabet: string[];
  samples: string[];
}
