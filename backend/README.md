# Backend - LLM Unit Test Generator

Node.js/Express backend for the LLM-powered unit test generator.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
# Edit .env and add your DEEPSEEK_API_KEY

# Start development server
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate` | Generate unit tests |
| GET | `/api/history` | List generation history |
| GET | `/api/history/:id` | Get specific generation |
| DELETE | `/api/history/:id` | Delete generation |
| GET | `/api/health` | Health check |

## Generate Request

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def add(a, b): return a + b",
    "framework": "pytest",
    "language": "python"
  }'
```

## Project Structure

```
backend/
├── src/
│   ├── index.js           # Express app entry
│   ├── config/            # Environment config
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── models/            # Database models
│   └── utils/             # Utilities
├── package.json
└── .env.example
```
