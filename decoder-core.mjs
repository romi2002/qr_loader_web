export const FRAGMENT_VERSION_PREFIX = "v1/";
export const BASE43_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:";
const BASE43 = 43;
const MAX_BASE43_CHARACTERS = 1554;

function failure(code, message) {
  return { ok: false, code, message };
}

export function decodeBase43(payload) {
  if (!payload || payload.length > MAX_BASE43_CHARACTERS) {
    return failure(
      payload ? "too_large" : "empty_payload",
      "The Base43 payload length is invalid."
    );
  }
  if (payload.length % 3 === 1) {
    return failure("invalid_length", "The Base43 payload is incomplete.");
  }

  const values = [];
  for (const character of payload) {
    const value = BASE43_ALPHABET.indexOf(character);
    if (value < 0) {
      return failure("invalid_character", "The Base43 payload is invalid.");
    }
    values.push(value);
  }

  const bytes = [];
  let offset = 0;
  while (offset + 3 <= values.length) {
    const value =
      values[offset] * BASE43 * BASE43 +
      values[offset + 1] * BASE43 +
      values[offset + 2];
    if (value > 0xffff) {
      return failure("invalid_value", "The Base43 payload is invalid.");
    }
    bytes.push(value >> 8, value & 0xff);
    offset += 3;
  }

  if (offset < values.length) {
    const value = values[offset] * BASE43 + values[offset + 1];
    if (value > 0xff) {
      return failure("invalid_value", "The Base43 payload is invalid.");
    }
    bytes.push(value);
  }

  return { ok: true, bytes: Uint8Array.from(bytes) };
}

export function decodeJpegFragment(fragment) {
  const value = String(fragment ?? "").replace(/^#/, "");
  if (!value) {
    return failure("empty", "The URL does not contain an image.");
  }
  if (!value.startsWith(FRAGMENT_VERSION_PREFIX)) {
    return failure("unsupported", "The image encoding is not supported.");
  }

  const decoded = decodeBase43(
    value.slice(FRAGMENT_VERSION_PREFIX.length)
  );
  if (!decoded.ok) {
    return decoded;
  }

  const { bytes } = decoded;
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
