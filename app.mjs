import { decodeJpegFragment } from "./decoder-core.mjs";

let objectUrl = null;

function render() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  document.body.replaceChildren();

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
  document.body.append(image);
}

window.addEventListener("hashchange", render);
window.addEventListener("pagehide", () => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
});
render();

