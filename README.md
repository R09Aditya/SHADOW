# SHADOW
# SHADOW OSINT workspace

SHADOW is a polished, fictional OSINT investigation-board demo for organizing lawfully obtained public information. The UI is intentionally marked **SIMULATED DATA** and makes no external API calls.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## Demo flow

- Load the default **Project Nightfall** case.
- Search entities, select and drag graph nodes, and use **Follow thread** to highlight the network.
- Add a note/entity from the inspector, create an investigation, inspect the case summary, and export a JSON snapshot.
- Board changes persist in `localStorage` between reloads.
