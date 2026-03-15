# Get homeMaker running in 5 minutes

This tutorial walks you through cloning homeMaker, installing dependencies, and opening the UI for the first time. By the end you will have a running local instance you can log into.

## Prerequisites

- Node.js 22 or higher
- npm 10 or higher
- An [Anthropic API key](https://console.anthropic.com)

## Steps

### 1. Clone the repository

```bash
git clone https://github.com/your-org/homeMaker.git
cd homeMaker
```

### 2. Install dependencies

```bash
npm install
npm run build:packages
```

### 3. Configure environment variables

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```bash
ANTHROPIC_API_KEY=sk-ant-...
HOMEMAKER_VAULT_KEY=your-64-char-hex-key
```

Generate the vault key with:

```bash
openssl rand -hex 32
```

### 4. Start the development server

```bash
npm run dev:full
```

This starts both the UI (port 8578) and the backend API (port 8579).

### 5. Open the UI

Navigate to `http://localhost:8578` in your browser.

You should see the homeMaker dashboard. The board, calendar, sensor registry, and all other modules are ready to use.

## Next steps

- [Detailed installation guide](./installation.md) — covers Linux, macOS, Windows, and all environment variables
- [Add your first asset](./first-asset.md) — a tutorial for adding an inventory item and maintenance schedule
