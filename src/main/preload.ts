// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  INVOKE_CHANNELS,
  RECEIVE_CHANNELS,
  SEND_CHANNELS,
  type InvokeChannel,
  type ReceiveChannel,
  type Result,
  type SendChannel,
} from '../shared/ipc';

/**
 * Only the channels listed in `shared/ipc` cross the bridge. The previous
 * version forwarded any string, which let the renderer reach every channel in
 * the main process.
 */
const assertChannel = <T extends string>(allowed: readonly T[], channel: T) => {
  if (!allowed.includes(channel)) {
    throw new Error(`Blocked IPC channel: ${channel}`);
  }
};

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: SendChannel, ...args: unknown[]) {
      assertChannel(SEND_CHANNELS, channel);
      ipcRenderer.send(channel, ...args);
    },
    on(channel: ReceiveChannel, func: (...args: unknown[]) => void) {
      assertChannel(RECEIVE_CHANNELS, channel);
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);
      // Callers must keep this and call it on unmount, otherwise navigating
      // back and forth stacks duplicate listeners.
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: ReceiveChannel, func: (...args: unknown[]) => void) {
      assertChannel(RECEIVE_CHANNELS, channel);
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke<T = unknown>(
      channel: InvokeChannel,
      ...args: unknown[]
    ): Promise<Result<T>> {
      assertChannel(INVOKE_CHANNELS, channel);
      return ipcRenderer.invoke(channel, ...args);
    },
  },
  controlWindow: (action: 'minimize' | 'maximize' | 'close') =>
    ipcRenderer.send('window-control', action),
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
