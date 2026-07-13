import assert from "node:assert/strict";
import test from "node:test";

import {
  FRAGMENT_VERSION_PREFIX,
  LEGACY_DATA_PREFIX,
  decodeJpegFragment,
  integerScaleSize,
} from "../decoder-core.mjs";

const MINIMAL_JPEG_BASE64 = "/9j/2Q==";

test("decodes the versioned firmware fragment", () => {
  const result = decodeJpegFragment(
    `#${FRAGMENT_VERSION_PREFIX}${MINIMAL_JPEG_BASE64}`
  );
  assert.equal(result.ok, true);
  assert.deepEqual([...result.bytes], [0xff, 0xd8, 0xff, 0xd9]);
});

test("accepts raw and legacy data URL fragments", () => {
  assert.equal(decodeJpegFragment(`#${MINIMAL_JPEG_BASE64}`).ok, true);
  assert.equal(
    decodeJpegFragment(`#${LEGACY_DATA_PREFIX}${MINIMAL_JPEG_BASE64}`).ok,
    true
  );
});

test("reports empty, malformed, and non-JPEG payloads", () => {
  assert.equal(decodeJpegFragment("").code, "empty");
  assert.equal(decodeJpegFragment("#v1/not base64").code, "invalid_base64");
  assert.equal(decodeJpegFragment("#v1/dGV4dA==").code, "not_jpeg");
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
