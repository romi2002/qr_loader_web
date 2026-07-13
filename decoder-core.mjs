export const FRAGMENT_VERSION_PREFIX = "v1/";
export const LEGACY_DATA_PREFIX = "data:image/jpeg;base64,";
const MAX_BASE64_CHARACTERS = 2_000_000;

function failure(code, message) {
  return { ok: false, code, message };
}

export function decodeJpegFragment(fragment) {
  let payload = String(fragment ?? "").replace(/^#/, "");
  if (!payload) {
    return failure(
      "empty",
      "Scan the QR code shown on your Badge Camera to load a photo."
    );
  }

  if (payload.startsWith(FRAGMENT_VERSION_PREFIX)) {
    payload = payload.slice(FRAGMENT_VERSION_PREFIX.length);
  } else if (payload.startsWith(LEGACY_DATA_PREFIX)) {
    payload = payload.slice(LEGACY_DATA_PREFIX.length);
  }

  if (payload.length > MAX_BASE64_CHARACTERS) {
    return failure("too_large", "The photo payload is unexpectedly large.");
  }

  if (
    payload.length === 0 ||
    payload.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)
  ) {
    return failure("invalid_base64", "This QR code does not contain a valid photo.");
  }

  let binary;
  try {
    binary = atob(payload);
  } catch {
    return failure("invalid_base64", "This QR code does not contain a valid photo.");
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[bytes.length - 2] !== 0xff ||
    bytes[bytes.length - 1] !== 0xd9
  ) {
    return failure("not_jpeg", "The decoded payload is not a complete JPEG image.");
  }

  return { ok: true, bytes };
}

export function integerScaleSize(
  sourceWidth,
  sourceHeight,
  availableWidth,
  availableHeight
) {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return { width: 0, height: 0 };
  }

  const fit = Math.min(
    availableWidth / sourceWidth,
    availableHeight / sourceHeight
  );
  const scale = fit >= 1 ? Math.floor(fit) : fit;
  return {
    width: Math.max(1, Math.floor(sourceWidth * scale)),
    height: Math.max(1, Math.floor(sourceHeight * scale)),
  };
}
