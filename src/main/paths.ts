/** Every on-disk location the app touches, resolved for dev *and* packaged. */
import path from 'path';
import { app } from 'electron';

/** `assets/` — bundled as `extraResources` in a packaged build. */
export function resourcesPath(...parts: string[]) {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');
  return path.join(base, ...parts);
}

/** The read-only library of example machines. */
export function examplesPath(...parts: string[]) {
  return resourcesPath('examples', ...parts);
}

/**
 * Where the machine the user is working on is kept.
 *
 * This used to be `./config.json`, resolved against the *current working
 * directory*, which meant the app wrote into whatever folder it happened to be
 * launched from and failed outright inside a read-only app bundle.
 */
export function workingConfigPath() {
  return path.join(app.getPath('userData'), 'current-machine.json');
}

export default { resourcesPath, examplesPath, workingConfigPath };
