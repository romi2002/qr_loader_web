import {
  decodeJpegFragment,
  inspectJpeg,
  integerScaleSize,
} from "./decoder-core.mjs?v=base43-diagnostics";

let objectUrl = null;
let displayedImage = null;
let receivedMetadata = null;

function logDisplayDiagnostics(size) {
  const naturalWidth = displayedImage.naturalWidth;
  const naturalHeight = displayedImage.naturalHeight;
  console.info("[Badge Camera] Browser display", {
    jpegDimensions: `${naturalWidth}x${naturalHeight}`,
    cssDimensions: `${size.width}x${size.height}`,
    cssScale: size.width / naturalWidth,
    devicePixelRatio: window.devicePixelRatio,
    approximatePhysicalDimensions:
      `${Math.round(size.width * window.devicePixelRatio)}x` +
      `${Math.round(size.height * window.devicePixelRatio)}`,
    rendering: "pixelated (nearest-neighbor requested)",
    browserReencodedImage: false,
  });
}

function resizeImage() {
  if (!displayedImage?.naturalWidth || !displayedImage?.naturalHeight) {
    return;
  }
  const size = integerScaleSize(
    displayedImage.naturalWidth,
    displayedImage.naturalHeight,
    window.innerWidth,
    window.innerHeight
  );
  displayedImage.style.width = `${size.width}px`;
  displayedImage.style.height = `${size.height}px`;
  logDisplayDiagnostics(size);
}

function logReceivedImage(decoded) {
  const base43Characters = location.hash.replace(/^#v1\//, "").length;
  receivedMetadata = inspectJpeg(decoded.bytes);
  const rawGrayscaleBytes =
    receivedMetadata.width && receivedMetadata.height
      ? receivedMetadata.width * receivedMetadata.height
      : null;

  console.group("[Badge Camera] Received QR image");
  console.info("Transfer", {
    urlCharacters: location.href.length,
    fragmentCharacters: location.hash.length,
    base43Characters,
    decodedJpegBytes: decoded.bytes.length,
    encoding: "Base43",
  });
  console.info("Original JPEG received by this page", {
    dimensions:
      receivedMetadata.width && receivedMetadata.height
        ? `${receivedMetadata.width}x${receivedMetadata.height}`
        : "unknown",
    precisionBits: receivedMetadata.precisionBits,
    componentCount: receivedMetadata.componentCount,
    colorModel:
      receivedMetadata.componentCount === 1 ? "grayscale" : "multi-component",
    jpegBytes: receivedMetadata.byteLength,
    rawGrayscaleBytes,
    compressionRatio:
      rawGrayscaleBytes
        ? `${(rawGrayscaleBytes / receivedMetadata.byteLength).toFixed(2)}:1`
        : "unknown",
    components: receivedMetadata.components,
    quantizationTables: receivedMetadata.quantizationTables,
    markersBeforeScan: receivedMetadata.markers,
  });
  console.log("Exact decoded JPEG bytes", decoded.bytes);
  console.info(
    "The camera-frame dimensions are not carried in v1. The dimensions above " +
      "are the already-downsampled, already-compressed JPEG produced by the firmware; " +
      "the browser displays it without JPEG re-encoding."
  );
  console.groupEnd();
}

function render() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  document.body.replaceChildren();
  displayedImage = null;
  receivedMetadata = null;

  const decoded = decodeJpegFragment(location.hash);
  if (!decoded.ok) {
    if (location.hash) {
      console.warn("[Badge Camera] QR image rejected", {
        code: decoded.code,
        message: decoded.message,
        fragmentCharacters: location.hash.length,
      });
    }
    return;
  }
  logReceivedImage(decoded);

  objectUrl = URL.createObjectURL(
    new Blob([decoded.bytes], { type: "image/jpeg" })
  );
  const image = document.createElement("img");
  image.src = objectUrl;
  image.alt = "Badge Camera photo";
  image.addEventListener("load", resizeImage, { once: true });
  image.addEventListener("error", () => {
    console.error("[Badge Camera] Browser could not decode the validated JPEG", {
      receivedMetadata,
    });
  }, { once: true });
  displayedImage = image;
  document.body.append(image);
}

window.addEventListener("hashchange", render);
window.addEventListener("resize", resizeImage);
window.addEventListener("pagehide", () => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
});
render();
