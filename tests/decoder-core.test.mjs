import assert from "node:assert/strict";
import test from "node:test";

import {
  BASE43_ALPHABET,
  FRAGMENT_VERSION_PREFIX,
  decodeBase43,
  decodeJpegFragment,
  integerScaleSize,
} from "../decoder-core.mjs";

const MINIMAL_JPEG_BASE43 = "ZI7ZI8";

test("decodes the Base43 firmware fragment", () => {
  const result = decodeJpegFragment(
    `#${FRAGMENT_VERSION_PREFIX}${MINIMAL_JPEG_BASE43}`
  );
  assert.equal(result.ok, true);
  assert.deepEqual([...result.bytes], [0xff, 0xd8, 0xff, 0xd9]);
});

test("decodes known even and odd Base43 vectors", () => {
  assert.deepEqual([...decodeBase43("ZJ3").bytes], [0xff, 0xff]);
  assert.deepEqual([...decodeBase43("ZJ30:").bytes], [0xff, 0xff, 0x2a]);
  assert.deepEqual([...decodeBase43("5.").bytes], [0xff]);
});

test("rejects malformed Base43 groups and values", () => {
  assert.equal(decodeBase43("").code, "empty_payload");
  assert.equal(decodeBase43("A").code, "invalid_length");
  assert.equal(decodeBase43("abc").code, "invalid_character");
  assert.equal(decodeBase43(":::").code, "invalid_value");
  assert.equal(decodeBase43("::").code, "invalid_value");
});

test("rejects old Base64, legacy data URLs, and non-JPEG data", () => {
  assert.equal(decodeJpegFragment("").code, "empty");
  assert.notEqual(decodeJpegFragment("#v1//9j/2Q==").ok, true);
  assert.equal(
    decodeJpegFragment("#data:image/jpeg;base64,/9j/2Q==").code,
    "unsupported"
  );
  assert.equal(decodeJpegFragment("#v1/000").code, "not_jpeg");
});

test("preserves every Base43 character in a URL fragment", () => {
  const url = new URL(
    `https://qr.abiel.dev/#${FRAGMENT_VERSION_PREFIX}${BASE43_ALPHABET}`
  );
  assert.equal(
    url.hash,
    `#${FRAGMENT_VERSION_PREFIX}${BASE43_ALPHABET}`
  );
});

test("uses the largest integer pixel scale that fits", () => {
  assert.deepEqual(integerScaleSize(128, 128, 390, 844), {
    width: 384,
    height: 384,
  });
  assert.deepEqual(integerScaleSize(96, 96, 390, 844), {
    width: 384,
    height: 384,
  });
  assert.deepEqual(integerScaleSize(32, 32, 390, 844), {
    width: 384,
    height: 384,
  });
});

test("fits images into viewports smaller than the source", () => {
  assert.deepEqual(integerScaleSize(128, 128, 64, 96), {
    width: 64,
    height: 64,
  });
  assert.deepEqual(integerScaleSize(0, 128, 390, 844), {
    width: 0,
    height: 0,
  });
});
