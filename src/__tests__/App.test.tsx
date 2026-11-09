import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import App from '../renderer/App';

/** The renderer talks to the main process through `window.electron`. */
beforeAll(() => {
  (window as unknown as Record<string, unknown>).electron = {
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn(() => () => {}),
      once: jest.fn(),
      invoke: jest.fn(async () => ({ ok: true, data: undefined })),
    },
    controlWindow: jest.fn(),
  };
});

describe('App', () => {
  it('should render the start screen', async () => {
    const { findByText } = render(<App />);
    expect(await findByText('Start')).toBeInTheDocument();
  });
});
