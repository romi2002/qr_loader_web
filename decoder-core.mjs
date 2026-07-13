export const FRAGMENT_VERSION_PREFIX = "v1/";
export const BASE43_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:";
const BASE43 = 43;
const MAX_BASE43_CHARACTERS = 1554;

const FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);

function markerName(marker) {
  if (marker === 0xd8) return "SOI";
  if (marker === 0xd9) return "EOI";
  if (marker === 0xda) return "SOS";
  if (marker === 0xdb) return "DQT";
  if (marker === 0xc4) return "DHT";
  if (marker === 0xdd) return "DRI";
  if (FRAME_MARKERS.has(marker)) return `SOF${marker & 0x0f}`;
  if (marker >= 0xe0 && marker <= 0xef) return `APP${marker - 0xe0}`;
  if (marker === 0xfe) return "COM";
  return `0xFF${marker.toString(16).padStart(2, "0").toUpperCase()}`;
}

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

export function inspectJpeg(bytes) {
  const metadata = {
    byteLength: bytes?.length ?? 0,
    width: null,
    height: null,
    precisionBits: null,
    componentCount: null,
    components: [],
    quantizationTables: [],
    markers: [],
  };
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8
  ) {
    return metadata;
  }

  metadata.markers.push("SOI");
  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      break;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) {
      break;
    }

    const marker = bytes[offset++];
    metadata.markers.push(markerName(marker));
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      continue;
    }
    if (offset + 1 >= bytes.length) {
      break;
    }

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      break;
    }
    const dataStart = offset + 2;
    const dataEnd = offset + segmentLength;

    if (FRAME_MARKERS.has(marker) && dataEnd - dataStart >= 6) {
      metadata.precisionBits = bytes[dataStart];
      metadata.height = (bytes[dataStart + 1] << 8) | bytes[dataStart + 2];
      metadata.width = (bytes[dataStart + 3] << 8) | bytes[dataStart + 4];
      metadata.componentCount = bytes[dataStart + 5];
      metadata.components = [];
      for (
        let componentOffset = dataStart + 6;
        componentOffset + 2 < dataEnd;
        componentOffset += 3
      ) {
        const sampling = bytes[componentOffset + 1];
        metadata.components.push({
          id: bytes[componentOffset],
          horizontalSampling: sampling >> 4,
          verticalSampling: sampling & 0x0f,
          quantizationTable: bytes[componentOffset + 2],
        });
      }
    } else if (marker === 0xdb) {
      let tableOffset = dataStart;
      while (tableOffset < dataEnd) {
        const tableInfo = bytes[tableOffset++];
        const precisionBits = (tableInfo >> 4) === 0 ? 8 : 16;
        const valueBytes = precisionBits / 8;
        const tableByteLength = 64 * valueBytes;
        if (tableOffset + tableByteLength > dataEnd) {
          break;
        }
        const values = [];
        for (let index = 0; index < 64; index += 1) {
          let value = bytes[tableOffset++];
          if (valueBytes === 2) {
            value = (value << 8) | bytes[tableOffset++];
          }
          values.push(value);
        }
        metadata.quantizationTables.push({
          id: tableInfo & 0x0f,
          precisionBits,
          minimum: Math.min(...values),
          maximum: Math.max(...values),
          average: values.reduce((sum, value) => sum + value, 0) / values.length,
          values,
        });
      }
    }

    offset += segmentLength;
  }

  return metadata;
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
