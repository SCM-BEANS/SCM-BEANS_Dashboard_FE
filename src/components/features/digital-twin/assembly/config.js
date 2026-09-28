export const SUPPORTED_VIEW_MODES = Object.freeze([
  'assembly',
  'body',
  'piston',
  'shaft',
  'nut',
  'leftNut',
  'rightArm',
  'leftArm',
  'spArmRight',
  'spArmLeft',
  'sp2ArmLeft',
  'sp2ArmRight',
]);

export const DEFAULT_MODEL_COLORS = Object.freeze({
  body: { color: 0x5f7fa4, metalness: 0.18, roughness: 0.38 },
  piston: { color: 0xf09a4b, metalness: 0.42, roughness: 0.25 },
  shaft: { color: 0x4fb8c8, metalness: 0.72, roughness: 0.2 },
  rightNut: { color: 0xe4b84d, metalness: 0.58, roughness: 0.24 },
  leftNut: { color: 0xd99043, metalness: 0.58, roughness: 0.24 },
  rightArm: { color: 0xe7775f, metalness: 0.3, roughness: 0.3 },
  leftArm: { color: 0x63c6a2, metalness: 0.3, roughness: 0.3 },
  supportRight: { color: 0xae8ce7, metalness: 0.28, roughness: 0.3 },
  supportLeft: { color: 0x68a8e8, metalness: 0.28, roughness: 0.3 },
  supportLeft2: { color: 0xf08ab5, metalness: 0.28, roughness: 0.3 },
  supportRight2: { color: 0xf0bc68, metalness: 0.28, roughness: 0.3 },
  wiperGear: { color: 0xd56b2f, metalness: 0.5, roughness: 0.24 },
  wiper: { color: 0x566b83, metalness: 0.42, roughness: 0.28 },
});

const DEFAULT_COFFEE_FLOW_PATH = Object.freeze([
  Object.freeze([-0.027, -0.024, 0.003]),
  Object.freeze([-0.027, -0.041, 0.003]),
  Object.freeze([-0.027, -0.059, 0.003]),
  Object.freeze([-0.027, -0.077, 0.003]),
]);

export const DEFAULT_COFFEE_FLOW_CONFIG = Object.freeze({
  visible: false,
  playing: true,
  speed: 0.18,
  initialProgress: 0,
  repeat: true,
  color: 0x5a2a16,
  opacity: 0.9,
  radius: 0.0015,
  dropletCount: 12,
  radialSegments: 8,
  tubularSegments: 64,
  path: DEFAULT_COFFEE_FLOW_PATH,
});

export const DEFAULT_ASSEMBLY_CONFIG = Object.freeze({
  assetBaseUrl: '/models/digital-twin/cluster-01',
  dracoDecoderPath: '/draco-gltf/',
  enableMotion: true,
  modelRotation: [Math.PI, 0, 0],
  camPathOffset: [0, -0.008, 0],
  camInitialProgress: 0.08,
  modelColors: DEFAULT_MODEL_COLORS,
  coffeeFlow: DEFAULT_COFFEE_FLOW_CONFIG,
});

function readVector3(value, fallback, label) {
  const vector = Array.isArray(value)
    ? value
    : value && [value.x, value.y, value.z];
  if (!vector || vector.length !== 3 || vector.some(component => !Number.isFinite(component))) {
    throw new TypeError(`${label} must contain three finite numbers.`);
  }
  return vector.map(Number);
}

function readCoffeePath(value) {
  if (!Array.isArray(value) || value.length < 2) {
    throw new TypeError('coffeeFlow.path must contain at least two points.');
  }
  return value.map((point, index) => {
    if (!Array.isArray(point) || point.length !== 3
      || point.some(component => !Number.isFinite(component))) {
      throw new TypeError(`coffeeFlow.path[${index}] must contain three finite numbers.`);
    }
    return point.map(Number);
  });
}

function readCoffeeFlowConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('coffeeFlow must be an object.');
  }
  const coffee = {
    ...DEFAULT_COFFEE_FLOW_CONFIG,
    ...value,
    path: readCoffeePath(value.path ?? DEFAULT_COFFEE_FLOW_PATH),
  };
  for (const key of ['visible', 'playing', 'repeat']) {
    if (typeof coffee[key] !== 'boolean') {
      throw new TypeError(`coffeeFlow.${key} must be a boolean.`);
    }
  }
  for (const key of ['speed', 'initialProgress', 'opacity', 'radius']) {
    if (!Number.isFinite(coffee[key])) {
      throw new TypeError(`coffeeFlow.${key} must be a finite number.`);
    }
  }
  if (coffee.speed < 0) throw new TypeError('coffeeFlow.speed must be non-negative.');
  if (coffee.initialProgress < 0 || coffee.initialProgress >= 1) {
    throw new TypeError('coffeeFlow.initialProgress must be between 0 and 1.');
  }
  if (coffee.opacity < 0 || coffee.opacity > 1) {
    throw new TypeError('coffeeFlow.opacity must be between 0 and 1.');
  }
  if (coffee.radius <= 0) throw new TypeError('coffeeFlow.radius must be positive.');
  if (!Number.isInteger(coffee.dropletCount)
    || coffee.dropletCount < 1 || coffee.dropletCount > 64) {
    throw new TypeError('coffeeFlow.dropletCount must be an integer between 1 and 64.');
  }
  if (!Number.isInteger(coffee.radialSegments) || coffee.radialSegments < 3) {
    throw new TypeError('coffeeFlow.radialSegments must be an integer of at least 3.');
  }
  if (!Number.isInteger(coffee.tubularSegments) || coffee.tubularSegments < 2) {
    throw new TypeError('coffeeFlow.tubularSegments must be an integer of at least 2.');
  }
  if (!Number.isInteger(coffee.color) || coffee.color < 0 || coffee.color > 0xffffff) {
    throw new TypeError('coffeeFlow.color must be a valid hex color number.');
  }
  return coffee;
}

export function resolveAssemblyConfig(overrides = {}) {
  const config = { ...DEFAULT_ASSEMBLY_CONFIG, ...overrides };
  config.modelRotation = readVector3(
    overrides.modelRotation ?? DEFAULT_ASSEMBLY_CONFIG.modelRotation,
    DEFAULT_ASSEMBLY_CONFIG.modelRotation,
    'modelRotation',
  );
  config.camPathOffset = readVector3(
    overrides.camPathOffset ?? DEFAULT_ASSEMBLY_CONFIG.camPathOffset,
    DEFAULT_ASSEMBLY_CONFIG.camPathOffset,
    'camPathOffset',
  );
  if (!Number.isFinite(config.camInitialProgress)
    || config.camInitialProgress < 0 || config.camInitialProgress > 1) {
    throw new TypeError('camInitialProgress must be a finite number between 0 and 1.');
  }
  if (typeof config.assetBaseUrl !== 'string' || typeof config.dracoDecoderPath !== 'string') {
    throw new TypeError('assetBaseUrl and dracoDecoderPath must be strings.');
  }
  if (typeof config.enableMotion !== 'boolean') {
    throw new TypeError('enableMotion must be a boolean.');
  }
  config.coffeeFlow = readCoffeeFlowConfig(
    overrides.coffeeFlow ?? DEFAULT_COFFEE_FLOW_CONFIG,
  );
  return config;
}
