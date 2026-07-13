# QR Loader Web

A static, client-only decoder for JPEG images embedded in Badge Camera QR
codes. It is designed to be hosted at:

`https://romi2002.github.io/qr_loader_web/`

The firmware generates URLs in this form:

`https://romi2002.github.io/qr_loader_web/#v1/BASE64_JPEG`

Everything after `#` is a URL fragment. The browser uses it to reconstruct the
JPEG locally; it is not included in the HTTP request to GitHub Pages. The site
does not upload or persist the image.

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
http://localhost:8000/#v1/BASE64_JPEG
```

