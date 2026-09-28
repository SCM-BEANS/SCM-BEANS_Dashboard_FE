import { ASSET_ROLES, resolveAssetManifest } from './assets.js';
import { createConstraintOverlay } from './debug/constraintOverlay.js';
import { createCoffeeFlow } from './effects/coffeeFlow.js';
import { createMechanismMotion } from './motion/createMechanismMotion.js';
import {
  DEFAULT_MODEL_COLORS,
  SUPPORTED_VIEW_MODES,
  resolveAssemblyConfig,
} from './config.js';

const MODEL_STAGE_NAME = 'mechanism-model-stage';
const DEBUG_ROOT_NAME = 'mechanism-debug-root';
const VIEW_MODE_ROLES = Object.freeze({
  body: ['body'],
  piston: ['piston'],
  shaft: ['shaft'],
  nut: ['rightNut'],
  leftNut: ['leftNut'],
  rightArm: ['rightArm'],
  leftArm: ['leftArm'],
  spArmRight: ['supportRight'],
  spArmLeft: ['supportLeft'],
  sp2ArmLeft: ['supportLeft2'],
  sp2ArmRight: ['supportRight2'],
});

function createAssemblyError(code, message, details = {}, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.name = 'MechanismAssemblyError';
  error.code = code;
  error.details = details;
  return error;
}

function applyModelColor(model, colorConfig) {
  if (!model || !colorConfig) return;
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const tintMaterial = (material) => {
      const tinted = material.clone();
      tinted.color.setHex(colorConfig.color);
      if ('metalness' in tinted) tinted.metalness = colorConfig.metalness;
      if ('roughness' in tinted) tinted.roughness = colorConfig.roughness;
      tinted.needsUpdate = true;
      return tinted;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(tintMaterial)
      : tintMaterial(object.material);
  });
}

function loadGltf(loader, url, role, onProgress) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      (event) => onProgress?.({ role, loaded: event.loaded, total: event.total || 0 }),
      (error) => reject(error),
    );
  });
}

export function createMechanismAssembly({
  dependencies = {},
  assets = {},
  config: configOverrides = {},
  onProgress,
} = {}) {
  const { THREE, GLTFLoader, DRACOLoader } = dependencies;
  if (!THREE || !GLTFLoader || !DRACOLoader) {
    throw createAssemblyError(
      'ASSEMBLY_DEPENDENCY_MISSING',
      'Assembly requires THREE, GLTFLoader and DRACOLoader dependencies.',
    );
  }

  let config;
  try {
    config = resolveAssemblyConfig(configOverrides);
  } catch (cause) {
    throw createAssemblyError(
      'ASSEMBLY_CONFIG_INVALID',
      cause.message || 'Unable to resolve assembly configuration.',
      { causeCode: cause.code || null },
      cause,
    );
  }
  const manifest = resolveAssetManifest(assets, config.assetBaseUrl);
  const root = new THREE.Group();
  root.name = 'mechanism-assembly-root';
  const modelStage = new THREE.Group();
  modelStage.name = MODEL_STAGE_NAME;
  const debugRoot = new THREE.Group();
  debugRoot.name = DEBUG_ROOT_NAME;
  root.add(modelStage, debugRoot);

  let status = 'idle';
  let loadPromise;
  let models = null;
  let lastError = null;
  let disposed = false;
  let motionSetupStarted = false;
  let coffeeSetupStarted = false;
  let viewMode = 'assembly';
  let animationPlaying = false;
  let animationSpeed = 1;
  let manualDirection = 0;
  let debugVisible = true;
  let motion = null;
  let constraintOverlay = null;
  let coffeeFlow = null;
  let coffeeVisible = config.coffeeFlow.visible;
  let coffeePlaying = config.coffeeFlow.playing;
  let coffeeSpeed = config.coffeeFlow.speed;

  function applyViewMode() {
    if (!models) return;
    const visibleRoles = viewMode === 'assembly'
      ? ASSET_ROLES
      : (VIEW_MODE_ROLES[viewMode] || []);
    for (const role of ASSET_ROLES) models[role].visible = visibleRoles.includes(role);
  }

  function getState() {
    const motionState = motion?.getState();
    return {
      status,
      loaded: status === 'ready',
      disposed,
      assetRoles: models ? [...ASSET_ROLES] : [],
      lastError,
      viewMode,
      animationPlaying: motionState?.animationPlaying ?? animationPlaying,
      animationSpeed: motionState?.animationSpeed ?? animationSpeed,
      manualDirection: motionState?.manualDirection ?? manualDirection,
      debugVisible,
      constraintStatus: motionState?.constraintStatus || 'not-initialized',
      motion: motionState || null,
      coffee: coffeeFlow?.getState() || null,
    };
  }

  function getDiagnostics() {
    return {
      status,
      error: lastError,
      manifest,
      motionOwner: 'assembly',
      motion: motion?.getState() || null,
      coffee: coffeeFlow?.getState() || null,
      modelStageName: MODEL_STAGE_NAME,
      debugRootName: DEBUG_ROOT_NAME,
    };
  }

  async function load() {
    if (disposed) {
      throw createAssemblyError('ASSEMBLY_DISPOSED', 'Cannot load a disposed assembly.');
    }
    if (loadPromise) return loadPromise;

    status = 'loading';
    lastError = null;
    loadPromise = (async () => {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(config.dracoDecoderPath);
      dracoLoader.preload();
      loader.setDRACOLoader(dracoLoader);

      try {
        const loaded = await Promise.all(ASSET_ROLES.map(async (role, index) => {
          const gltf = await loadGltf(loader, manifest[role], role, (progress) => {
            onProgress?.({
              ...progress,
              index,
              count: ASSET_ROLES.length,
            });
          });
          return [role, gltf.scene];
        }));

        models = Object.fromEntries(loaded);
        const rotation = new THREE.Euler(...config.modelRotation);
        for (const role of ASSET_ROLES) {
          const model = models[role];
          model.rotation.copy(rotation);
          applyModelColor(model, config.modelColors?.[role] || DEFAULT_MODEL_COLORS[role]);
          modelStage.add(model);
        }
        modelStage.updateMatrixWorld(true);
        applyViewMode();
        if (config.enableMotion) {
          motionSetupStarted = true;
          motion = createMechanismMotion({
            THREE,
            models,
            modelStage,
            config,
          });
          motion.setup();
        }
        coffeeSetupStarted = true;
        coffeeFlow = createCoffeeFlow({
          THREE,
          config: {
            ...config.coffeeFlow,
            visible: coffeeVisible,
            playing: coffeePlaying,
            speed: coffeeSpeed,
          },
        });
        root.add(coffeeFlow.root);
        if (config.enableMotion) {
          constraintOverlay = createConstraintOverlay({
            THREE,
            models,
            parent: debugRoot,
          });
          constraintOverlay.setMode(viewMode);
          constraintOverlay.setVisible(debugVisible);
          constraintOverlay.update();
        }
        debugRoot.visible = debugVisible;
        status = 'ready';
        return {
          root,
          stage: modelStage,
          debugRoot,
          models: Object.freeze({ ...models }),
        };
      } catch (cause) {
        const failedDuringMotionSetup = motionSetupStarted;
        const failedDuringCoffeeSetup = coffeeSetupStarted;
        coffeeFlow?.dispose();
        coffeeFlow = null;
        constraintOverlay?.dispose();
        constraintOverlay = null;
        motion?.dispose();
        motion = null;
        for (const model of Object.values(models || {})) model.removeFromParent?.();
        models = null;
        motionSetupStarted = false;
        coffeeSetupStarted = false;
        status = 'failed';
        lastError = createAssemblyError(
          cause.code || (failedDuringCoffeeSetup
            ? 'ASSEMBLY_COFFEE_SETUP_FAILED'
            : failedDuringMotionSetup
              ? 'ASSEMBLY_MOTION_SETUP_FAILED'
              : 'ASSEMBLY_ASSET_LOAD_FAILED'),
          cause.message || 'Unable to initialize the mechanism assembly.',
          { manifest, causeCode: cause.code || null },
          cause,
        );
        loadPromise = null;
        throw lastError;
      }
    })();
    return loadPromise;
  }

  function update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new TypeError('deltaSeconds must be a non-negative finite number.');
    }
    if (disposed) return;
    motion?.update(deltaSeconds);
    coffeeFlow?.update(deltaSeconds);
    constraintOverlay?.update();
  }

  function setViewMode(mode) {
    if (!SUPPORTED_VIEW_MODES.includes(mode)) {
      throw new RangeError(`Unsupported assembly view mode: ${mode}`);
    }
    viewMode = mode;
    applyViewMode();
    constraintOverlay?.setMode(viewMode);
  }

  function setAnimationPlaying(playing) {
    animationPlaying = Boolean(playing);
    motion?.setAnimationPlaying(animationPlaying);
  }

  function setAnimationSpeed(speed) {
    if (!Number.isFinite(speed) || speed < 0) {
      throw new TypeError('Animation speed must be a non-negative finite number.');
    }
    animationSpeed = speed;
    motion?.setAnimationSpeed(animationSpeed);
  }

  function setManualDirection(direction) {
    if (![-1, 0, 1].includes(direction)) {
      throw new RangeError('Manual direction must be -1, 0 or 1.');
    }
    manualDirection = direction;
    motion?.setManualDirection(manualDirection);
  }

  function stepManual(direction) {
    const nextState = motion?.stepManual(direction);
    if (!motion) setManualDirection(direction);
    return nextState || getState();
  }

  function setDebugVisible(visible) {
    debugVisible = Boolean(visible);
    debugRoot.visible = debugVisible;
    constraintOverlay?.setVisible(debugVisible);
  }

  function setCoffeeVisible(visible) {
    coffeeVisible = Boolean(visible);
    coffeeFlow?.setVisible(coffeeVisible);
  }

  function setCoffeePlaying(playing) {
    coffeePlaying = Boolean(playing);
    coffeeFlow?.setPlaying(coffeePlaying);
  }

  function setCoffeeSpeed(speed) {
    if (!Number.isFinite(speed) || speed < 0) {
      throw new TypeError('Coffee speed must be a non-negative finite number.');
    }
    coffeeSpeed = speed;
    coffeeFlow?.setSpeed(coffeeSpeed);
  }

  function resetCoffee() {
    coffeeFlow?.reset();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    status = 'disposed';
    coffeeFlow?.dispose();
    coffeeFlow = null;
    motion?.dispose();
    motion = null;
    constraintOverlay?.dispose();
    constraintOverlay = null;
    root.removeFromParent();
    root.traverse((object) => {
      if (object.geometry?.dispose) object.geometry.dispose();
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose?.());
    });
    models = null;
    loadPromise = null;
  }

  return {
    root,
    load,
    update,
    setViewMode,
    setAnimationPlaying,
    setAnimationSpeed,
    setManualDirection,
    stepManual,
    setDebugVisible,
    setCoffeeVisible,
    setCoffeePlaying,
    setCoffeeSpeed,
    resetCoffee,
    getState,
    getDiagnostics,
    dispose,
  };
}
