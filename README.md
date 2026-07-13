# QR Loader Web

A static, client-only decoder for JPEG images embedded in Badge Camera QR
codes. It is hosted at:

`https://qr.abiel.dev/`

The firmware generates URLs in this form:

`https://qr.abiel.dev/#v1/BASE43_JPEG`

The firmware uses a URL-safe Base43 alphabet so the JPEG fragment can use QR
alphanumeric mode. This fits up to 1,036 JPEG bytes in a version-23-L symbol.
The v1 format is Base43 only; previous Base64 links are intentionally not
supported.

Everything after `#` is a URL fragment. The browser uses it to reconstruct the
JPEG locally; it is not included in the HTTP request to GitHub Pages. The site
does not upload or persist the image.

Open the browser developer console after loading a QR URL to inspect transfer
lengths, the exact decoded JPEG bytes, JPEG dimensions and grayscale components,
quantization tables, compression ratio, and the browser's pixel scaling. These
diagnostics are console-only; invalid or missing image data still leaves the
page blank.

## Publish with GitHub Pages

1. Commit and push this repository's `main` branch to
   `romi2002/qr_loader_web`.
2. In the GitHub repository, open **Settings > Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then save.

The `.nojekyll` file keeps GitHub Pages in direct static-file mode.

## Test locally

Run the decoder unit tests with a recent Node.js release:

```sh
node --test tests/*.test.mjs
```

Serve the directory with any static file server, then append a JPEG payload to
the URL fragment. For example:

```text
http://localhost:8000/#v1/BASE43_JPEG
```
