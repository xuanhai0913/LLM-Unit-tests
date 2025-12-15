# LLM-Powered Unit Test Generator

🚀 An intelligent web application that uses **Large Language Models (Deepseek)** to automatically generate comprehensive unit tests from source code.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![React](https://img.shields.io/badge/react-18-blue)

## Features

- **AI-Powered Generation** - Uses Deepseek LLM for intelligent test creation
- **Multi-Language Support** - Python, JavaScript, TypeScript
- **Multiple Frameworks** - pytest, unittest, Jest, Mocha
- **Modern UI** - Dark theme with Monaco code editor
- **Generation History** - Save and revisit past generations
- **Copy & Download** - Export generated tests instantly

##  Screenshots

| Code Input | Generated Tests |
|------------|-----------------|
| Monaco editor with syntax highlighting | AI-generated comprehensive tests |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Deepseek API Key ([Get one here](https://platform.deepseek.com))

### Installation

```bash
# Clone repository
git clone <repository-url>
cd LLM-Unit-tests

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env and add your DEEPSEEK_API_KEY

# Frontend setup
cd ../frontend
npm install
```

### Running

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## 📁 Project Structure

```
LLM-Unit-tests/
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── package.json
│
├── backend/           # Node.js + Express
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── services/
│   │   └── models/
│   └── package.json
│
└── docs/
    └── HUONG_DAN_KY_THUAT.md  # Vietnamese docs
```

##  API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/generate` | Generate unit tests |
| `GET` | `/api/history` | Get generation history |
| `DELETE` | `/api/history/:id` | Delete generation |
| `GET` | `/api/health` | Health check |

##  Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DEEPSEEK_API_KEY` | Your Deepseek API key | (required) |
| `PORT` | Backend port | 8000 |
| `MAX_TOKENS` | Max tokens for response | 2048 |
| `TEMPERATURE` | LLM creativity (0-1) | 0.7 |

##  Deployment

See [HUONG_DAN_KY_THUAT.md](docs/HUONG_DAN_KY_THUAT.md) for detailed Google Cloud VM deployment instructions.

### Quick Deploy with Docker

```bash
docker-compose up -d
```

##  Documentation

- [Vietnamese Technical Guide](docs/HUONG_DAN_KY_THUAT.md)
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)

## 🔗 References

- [Research Paper](https://dl.acm.org/doi/pdf/10.1145/3663529.3663839)
- [Video Tutorial](https://www.youtube.com/watch?v=VtJKQHoyb2A)
- [Deepseek API](https://platform.deepseek.com)


