# Fuel Receipt Studio

A responsive React fuel-bill generator rebuilt from the supplied saved webpage.
It creates petrol, diesel, CNG, and EV charging receipts with five live-preview
layouts, local receipt history, cloning, and browser-based PDF printing.

## Features

- live receipt preview while editing
- rate and total-based quantity calculation
- petrol, diesel, CNG, and EV units
- optional GSTIN, CST TIN, or transaction number
- five formal and thermal receipt layouts
- copyable plain-text summary
- print-only receipt layout for saving as PDF
- versioned JSON history in browser storage, with clone and delete controls
- automatic history save when printing and a manual Save bill action
- local-only data; receipt history is never uploaded

## Requirements

- Node.js `>=22.13.0`

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed in the terminal.

## Verify

```bash
npm run build
npm test
```

The application uses React 19, Next-compatible routing through vinext, and a
Cloudflare Worker-compatible build. No database, account, or external service is
required.

## GitHub Pages

The repository includes a GitHub Actions workflow that builds a static export
and deploys it to GitHub Pages whenever `main` is updated. In the GitHub
repository, set **Settings → Pages → Source** to **GitHub Actions** if it is not
selected automatically.

Browser history is specific to each browser, device, and website origin. It does
not sync between devices, and history created on `localhost` will not transfer
automatically to the public GitHub Pages address.
