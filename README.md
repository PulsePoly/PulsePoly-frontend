# Polymarket Search

A web application for searching events on Polymarket by keywords. Works without a backend, uses Vite proxy to bypass CORS restrictions.

## Features

- 🔍 **Event Search** by keywords on Polymarket
- 🤖 **AI Query Transformation** - if no events are found, AI automatically converts your query into a keyword for a new search
- 🌐 **Fully Frontend** - no backend needed, uses Vite proxy to bypass CORS

## Installation

```bash
npm install
```
## Running

```bash
npm run dev
```

## Usage

1. Open your browser at `http://localhost:5173` (or the address shown by Vite)
2. Enter a search keyword (e.g., "valorant" or "I love crypto")
3. Click "Search"
4. If no events are found, AI will automatically convert your query into a keyword and perform a new search
5. Browse the found events

### AI Example

If you enter "I love crypto" and no events are found:
1. The system will show: "Events not found. AI is analyzing your query..."
2. AI converts the query into the keyword "crypto"
3. A new search is automatically performed with the keyword "crypto"
4. Found events will be displayed

## Technologies

- React 18
- Vite
- Polymarket API
