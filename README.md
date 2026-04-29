# Strange Recipe Generator

A fully offline, locally hosted AI recipe generator with a retro CRT terminal UI.
Powered by **Ollama** + **Qwen3:8b**, built with **React** (Vite) + **Express**.

---

## Requirements

| Dependency | Version | Notes |
|---|---|---|
| Node.js | 18+ | Download from nodejs.org |
| Ollama | latest | [ollama.com](https://ollama.com) — must be installed & running |
| Qwen3:8b model | — | Pull with: `ollama pull qwen3.5:9b` |

> **No internet connection is required at runtime.** All AI inference runs locally through Ollama.

---

## First-Time Setup

Run this once after cloning to install all dependencies:

```bash
# From the project root:
npm install
cd backend && npm install
cd ../frontend && npm install
```

---

## Running the App

```bash
# From the project root — starts both backend and frontend:
npm run dev
```

| Service | URL |
|---|---|
| Frontend (React UI) | http://localhost:5173 |
| Backend (Express API) | http://localhost:3001 |

Open **http://localhost:5173** in your browser.

---

## Changing the Ollama Model

The default model is `qwen3.5:9b`. To use a different model:

1. Edit `backend/config.js`
2. Change the `ollamaModel` value to any model you have installed locally
3. Restart the backend

Or set the `OLLAMA_MODEL` environment variable before running.

---

## How It Works

### Two-Call AI Pipeline

1. **Call 1 — Concept Generation**
   The agent receives your ingredients and location, then creates a creative fusion recipe concept explaining the flavor science and cultural inspiration.

2. **Call 2 — Standard Formatting**
   The raw concept is passed to a second call that formats it into a structured recipe: name, servings, times, ingredients list with measurements, numbered instructions, and chef's notes.

### Location Context

The "Local Availability Region" input (default: San Francisco Bay Area, California) tells the AI which ingredients are seasonally and locally available when filling out complementary ingredients. You can change it to any region.

---

## PDF Export

**Download PDF** — generates a styled PDF (black background, phosphor green text) and saves it to your browser's Downloads folder.

**Save to Folder** — saves the PDF directly to any folder on your machine. Enter an absolute path (e.g. `C:\Users\You\Documents\Recipes`). The path is remembered between sessions.

---

## Security Features

- **Prompt injection detection** — 20+ regex patterns block known injection phrases before they reach the model
- **Input sanitization** — all user text is stripped to safe characters only
- **Rate limiting** — 10 requests per minute maximum
- **Content length limits** — inputs capped at 80–100 chars, max 20 ingredients
- **Strict CORS** — API only accepts requests from `localhost:5173`
- **Helmet.js** — security headers on all responses
- **Path traversal prevention** — PDF save paths are validated as absolute directories that must exist

---

## Project Structure

```
strange-recipe-gen/
├── backend/
│   ├── config.js              # Model name, port, Ollama URL
│   ├── server.js              # Express app entry point
│   ├── middleware/
│   │   └── security.js        # Input validation + injection detection
│   ├── routes/
│   │   ├── recipe.js          # POST /api/recipe/generate (SSE stream)
│   │   └── pdf.js             # POST /api/pdf/download + /save
│   └── services/
│       ├── ollama.js          # Two-call Ollama pipeline
│       └── pdfService.js      # PDFKit document builder
└── frontend/
    ├── vite.config.js         # Proxy /api → localhost:3001
    └── src/
        ├── App.jsx            # Main state, SSE reader
        ├── App.css            # Retro CRT terminal theme
        └── components/
            ├── Header.jsx         # Live clock + system info
            ├── IngredientForm.jsx # Ingredient list + location input
            ├── StatusTerminal.jsx # Live log terminal during generation
            └── RecipeDisplay.jsx  # Recipe output + PDF controls
```
