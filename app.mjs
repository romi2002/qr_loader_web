import { decodeJpegFragment, integerScaleSize } from "./decoder-core.mjs";

let objectUrl = null;
let displayedImage = null;

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
}

function render() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  document.body.replaceChildren();
  displayedImage = null;

  const decoded = decodeJpegFragment(location.hash);
  if (!decoded.ok) {
    return;
  }

  objectUrl = URL.createObjectURL(
    new Blob([decoded.bytes], { type: "image/jpeg" })
  );
  const image = document.createElement("img");
  image.src = objectUrl;
  image.alt = "Badge Camera photo";
  image.addEventListener("load", resizeImage, { once: true });
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
