const COFFEE_ROOT_NAME = 'coffee-flow-root';
const COFFEE_MESH_NAME = 'coffee-flow-mesh';
const COFFEE_DROPLET_GROUP_NAME = 'coffee-flow-droplets';

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uCoffeeColor;
  uniform float uFlowOffset;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    float wave = sin((vUv.x - uFlowOffset) * 25.1327412);
    float sheen = smoothstep(0.45, 0.95, wave * 0.5 + 0.5);
    float edge = smoothstep(0.0, 0.16, vUv.y)
      * (1.0 - smoothstep(0.84, 1.0, vUv.y));
    vec3 darkCoffee = uCoffeeColor * 0.72;
    vec3 lightCoffee = min(uCoffeeColor * 1.28 + vec3(0.04), vec3(1.0));
    vec3 color = mix(darkCoffee, lightCoffee, sheen * 0.36);
    float alpha = uOpacity * mix(0.78, 1.0, edge);
    gl_FragColor = vec4(color, alpha);
  }
`;

function assertFinite(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
}

function readPath(config) {
  if (!Array.isArray(config.path) || config.path.length < 2) {
    throw new TypeError('coffeeFlow.path must contain at least two points.');
  }
  return config.path.map((point, index) => {
    if (!Array.isArray(point) || point.length !== 3
      || point.some(component => !Number.isFinite(component))) {
      throw new TypeError(`coffeeFlow.path[${index}] must contain three finite numbers.`);
    }
    return point.map(Number);
  });
}

function resolveEffectConfig(config = {}) {
  const path = readPath(config);
  const resolved = {
    visible: Boolean(config.visible),
    playing: config.playing !== false,
    repeat: config.repeat !== false,
    speed: config.speed ?? 0,
    initialProgress: config.initialProgress ?? 0,
    color: config.color ?? 0x5a2a16,
    opacity: config.opacity ?? 1,
    radius: config.radius ?? 0.0015,
    dropletCount: config.dropletCount ?? 12,
    radialSegments: config.radialSegments ?? 8,
    tubularSegments: config.tubularSegments ?? 64,
    path,
  };
  assertFinite(resolved.speed, 'coffeeFlow.speed');
  assertFinite(resolved.initialProgress, 'coffeeFlow.initialProgress');
  assertFinite(resolved.opacity, 'coffeeFlow.opacity');
  assertFinite(resolved.radius, 'coffeeFlow.radius');
  if (resolved.speed < 0) throw new TypeError('coffeeFlow.speed must be non-negative.');
  if (resolved.initialProgress < 0 || resolved.initialProgress >= 1) {
    throw new TypeError('coffeeFlow.initialProgress must be between 0 and 1.');
  }
  if (resolved.opacity < 0 || resolved.opacity > 1) {
    throw new TypeError('coffeeFlow.opacity must be between 0 and 1.');
  }
  if (resolved.radius <= 0) throw new TypeError('coffeeFlow.radius must be positive.');
  if (!Number.isInteger(resolved.dropletCount)
    || resolved.dropletCount < 1 || resolved.dropletCount > 64) {
    throw new TypeError('coffeeFlow.dropletCount must be an integer between 1 and 64.');
  }
  if (!Number.isInteger(resolved.radialSegments) || resolved.radialSegments < 3) {
    throw new TypeError('coffeeFlow.radialSegments must be an integer of at least 3.');
  }
  if (!Number.isInteger(resolved.tubularSegments) || resolved.tubularSegments < 2) {
    throw new TypeError('coffeeFlow.tubularSegments must be an integer of at least 2.');
  }
  if (!Number.isInteger(resolved.color) || resolved.color < 0 || resolved.color > 0xffffff) {
    throw new TypeError('coffeeFlow.color must be a valid hex color number.');
  }
  return resolved;
}

function disposeMaterial(material) {
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach(item => item?.dispose?.());
}

export function createCoffeeFlow({ THREE, config } = {}) {
  if (!THREE) throw new TypeError('Coffee flow requires a THREE dependency.');
  const resolved = resolveEffectConfig(config);
  const points = resolved.path.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geometry = new THREE.TubeGeometry(
    curve,
    resolved.tubularSegments,
    resolved.radius * 0.58,
    resolved.radialSegments,
    false,
  );
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uCoffeeColor: { value: new THREE.Color(resolved.color) },
      uFlowOffset: { value: resolved.initialProgress },
      uOpacity: { value: resolved.opacity },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: resolved.opacity < 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = COFFEE_MESH_NAME;
  const dropletGeometry = new THREE.SphereGeometry(1, 12, 8);
  const dropletMaterial = new THREE.MeshStandardMaterial({
    color: resolved.color,
    roughness: 0.2,
    metalness: 0,
    transparent: resolved.opacity < 1,
    opacity: Math.min(1, resolved.opacity + 0.08),
    depthWrite: false,
  });
  const droplets = Array.from({ length: resolved.dropletCount }, (_, index) => {
    const droplet = new THREE.Mesh(dropletGeometry, dropletMaterial);
    droplet.name = `coffee-droplet-${index + 1}`;
    droplet.frustumCulled = false;
    return droplet;
  });
  const dropletGroup = new THREE.Group();
  dropletGroup.name = COFFEE_DROPLET_GROUP_NAME;
  dropletGroup.add(...droplets);
  const root = new THREE.Group();
  root.name = COFFEE_ROOT_NAME;
  root.visible = resolved.visible;
  root.add(mesh, dropletGroup);

  let visible = resolved.visible;
  let playing = resolved.playing;
  let speed = resolved.speed;
  let progress = resolved.initialProgress;
  let disposed = false;
  const dropletAxis = new THREE.Vector3(0, 1, 0);

  function syncDroplets() {
    droplets.forEach((droplet, index) => {
      const phase = (progress + index / resolved.dropletCount) % 1;
      const point = curve.getPointAt(phase);
      const tangent = curve.getTangentAt(phase).normalize();
      const pulse = 0.82 + 0.18 * (
        0.5 + 0.5 * Math.sin((phase + index * 0.37) * Math.PI * 2)
      );
      droplet.position.copy(point);
      droplet.quaternion.setFromUnitVectors(dropletAxis, tangent);
      droplet.scale.set(
        resolved.radius * 1.05 * pulse,
        resolved.radius * 2.7 * pulse,
        resolved.radius * 1.05 * pulse,
      );
    });
  }

  function syncVisuals() {
    material.uniforms.uFlowOffset.value = progress;
    syncDroplets();
  }

  function getState() {
    return {
      visible,
      playing,
      repeat: resolved.repeat,
      speed,
      progress,
      dropletCount: resolved.dropletCount,
      disposed,
    };
  }

  function update(deltaSeconds) {
    assertFinite(deltaSeconds, 'deltaSeconds');
    if (deltaSeconds < 0) throw new TypeError('deltaSeconds must be non-negative.');
    if (disposed || !playing || speed === 0 || deltaSeconds === 0) return;

    const nextProgress = progress + speed * deltaSeconds;
    if (resolved.repeat) {
      progress = nextProgress % 1;
    } else if (nextProgress >= 1) {
      progress = 1;
      playing = false;
    } else {
      progress = nextProgress;
    }
    syncVisuals();
  }

  function setVisible(nextVisible) {
    visible = Boolean(nextVisible);
    root.visible = visible;
  }

  function setPlaying(nextPlaying) {
    playing = Boolean(nextPlaying);
  }

  function setSpeed(nextSpeed) {
    assertFinite(nextSpeed, 'coffeeFlow.speed');
    if (nextSpeed < 0) throw new TypeError('coffeeFlow.speed must be non-negative.');
    speed = nextSpeed;
  }

  function reset() {
    progress = resolved.initialProgress;
    syncVisuals();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    geometry.dispose();
    disposeMaterial(material);
    dropletGeometry.dispose();
    disposeMaterial(dropletMaterial);
    root.removeFromParent();
  }

  syncVisuals();

  return {
    root,
    update,
    setVisible,
    setPlaying,
    setSpeed,
    reset,
    getState,
    dispose,
  };
}
