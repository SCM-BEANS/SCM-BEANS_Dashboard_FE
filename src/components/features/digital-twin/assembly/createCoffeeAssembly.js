import { createCoffeeFlow } from './effects/coffeeFlow.js';
import { resolveAssemblyConfig } from './config.js';

function createCoffeeAssemblyError(code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.name = 'CoffeeAssemblyError';
  error.code = code;
  return error;
}

export function createCoffeeAssembly({ dependencies = {}, config: configOverrides = {} } = {}) {
  const { THREE } = dependencies;
  if (!THREE) {
    throw createCoffeeAssemblyError(
      'COFFEE_DEPENDENCY_MISSING',
      'Coffee assembly requires a THREE dependency.',
    );
  }

  let config;
  try {
    config = resolveAssemblyConfig({ coffeeFlow: configOverrides });
  } catch (cause) {
    throw createCoffeeAssemblyError(
      'COFFEE_CONFIG_INVALID',
      cause.message || 'Unable to resolve coffee configuration.',
      cause,
    );
  }

  let effect;
  try {
    effect = createCoffeeFlow({ THREE, config: config.coffeeFlow });
  } catch (cause) {
    throw createCoffeeAssemblyError(
      'COFFEE_SETUP_FAILED',
      cause.message || 'Unable to initialize coffee flow.',
      cause,
    );
  }

  const root = new THREE.Group();
  root.name = 'coffee-assembly-root';
  root.add(effect.root);
  let disposed = false;

  function update(deltaSeconds) {
    if (disposed) return;
    effect.update(deltaSeconds);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    effect.dispose();
    root.removeFromParent();
  }

  return {
    root,
    update,
    setVisible: effect.setVisible,
    setPlaying: effect.setPlaying,
    setSpeed: effect.setSpeed,
    reset: effect.reset,
    getState: () => ({
      status: disposed ? 'disposed' : 'ready',
      coffee: effect.getState(),
      disposed,
    }),
    getDiagnostics: () => ({
      status: disposed ? 'disposed' : 'ready',
      coffee: effect.getState(),
    }),
    dispose,
  };
}
