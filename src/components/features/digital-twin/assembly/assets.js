export const DEFAULT_ASSET_MANIFEST = Object.freeze({
  body: 'static_body.glb',
  piston: 'piston.glb',
  shaft: 'truc.glb',
  rightNut: 'oc_phai.glb?v=20260921-new',
  leftNut: 'oc_trai.glb?v=20260921-new',
  rightArm: 'right_arm.glb?v=right-arm-hole-8mm-20260921',
  leftArm: 'left_arm.glb?v=20260921-new',
  supportRight: 'sp_arm_right.glb?v=20260921-new',
  supportLeft: 'sp_arm_left.glb?v=20260921-new',
  supportLeft2: 'sp2_arm_left.glb?v=20260922',
  supportRight2: 'sp2_arm_right.glb?v=right-slot-1',
  wiperGear: 'wiper_gear.glb?v=wiper-gear-1',
  wiper: 'wiper.glb?v=wiper-1',
});

export const ASSET_ROLES = Object.freeze(Object.keys(DEFAULT_ASSET_MANIFEST));

function isAbsoluteUrl(value) {
  return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('data:') || value.startsWith('blob:');
}

export function resolveAssetUrl(asset, assetBaseUrl = './') {
  if (typeof asset !== 'string' || asset.length === 0) {
    throw new TypeError('Every assembly asset URL must be a non-empty string.');
  }
  if (isAbsoluteUrl(asset) || !assetBaseUrl) return asset;
  return `${assetBaseUrl.replace(/\/+$/, '')}/${asset.replace(/^\/+/, '')}`;
}

export function resolveAssetManifest(overrides = {}, assetBaseUrl = './') {
  const manifest = { ...DEFAULT_ASSET_MANIFEST, ...overrides };
  for (const role of ASSET_ROLES) {
    manifest[role] = resolveAssetUrl(manifest[role], assetBaseUrl);
  }
  return Object.freeze(manifest);
}

