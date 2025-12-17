# Backend Documentation

## 🎯 Tổng Quan

Backend là REST API server chạy trên **Node.js + Express**, kết nối với LLM APIs (Gemini/Deepseek) để generate unit tests và lưu lịch sử vào **SQLite** database.

### Tech Stack
| Công nghệ | Version | Mục đích |
|-----------|---------|----------|
| Node.js | >= 18 | Runtime |
| Express | 4.18 | Web framework |
| Sequelize | 6.35 | ORM |
| SQLite3 | 5.1 | Database |
| Axios | 1.6 | HTTP client (gọi LLM APIs) |
| dotenv | 16.3 | Environment config |

---

## 📂 Cấu Trúc Source

```
backend/src/
├── index.js              # Express server entry point
├── config/
│   └── index.js          # Environment configuration
├── routes/
│   ├── generate.js       # POST /api/generate
│   └── history.js        # GET/DELETE /api/history
├── services/
│   ├── testGenerator.js  # Core test generation logic
│   ├── llmClient.js      # Multi-provider LLM client
│   └── deepseekClient.js # Deepseek-specific (legacy)
├── models/
│   └── index.js          # Sequelize models (Generation)
└── utils/
    └── prompts.js        # Prompt engineering
```

---

## 🚀 Entry Point (index.js)

Express server với các middleware và routes.

```javascript
// Middleware stack
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.get('/api/health', ...);
app.use('/api/generate', generateRoutes);
app.use('/api/history', historyRoutes);
```

**Startup Flow:**
1. Validate config (API keys)
2. Initialize database (SQLite + Sequelize)
3. Start HTTP server

---

## ⚙️ Configuration (config/index.js)

Centralized configuration từ environment variables.

```javascript
const config = {
    // Server
    port: parseInt(process.env.PORT || '8000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // LLM Provider Selection
    llm: {
        provider: process.env.LLM_PROVIDER || 'gemini',
        apiKey: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY,
        model: process.env.LLM_MODEL || 'gemini-2.0-flash',
    },

    // Deepseek API (legacy)
    deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-coder',
    },

    // Google Gemini API
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-2.0-flash',
    },

    // Generation Settings
    generation: {
        maxTokens: parseInt(process.env.MAX_TOKENS || '4096'),
        temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
        topP: parseFloat(process.env.TOP_P || '0.95'),
    },

    // Database
    database: {
        url: process.env.DATABASE_URL || 'sqlite:./database.sqlite',
    },
};
```

---

## 📡 API Routes

### POST /api/generate

Generate unit tests từ source code.

**Request Body:**
| Field | Type | Required | Default | Mô tả |
|-------|------|----------|---------|-------|
| code | string | ✅ | - | Source code cần test |
| specs | string | ❌ | '' | Yêu cầu bổ sung |
| framework | string | ❌ | 'pytest' | Test framework |
| language | string | ❌ | 'python' | Ngôn ngữ lập trình |
| saveHistory | boolean | ❌ | true | Lưu vào history |

**Supported Values:**
- `framework`: pytest, unittest, jest, mocha
- `language`: python, javascript, typescript

**Response:**
```json
{
  "success": true,
  "data": {
    "generatedTests": "import pytest...",
    "framework": "pytest",
    "language": "python",
    "generationTime": 2500,
    "isValid": true,
    "id": "uuid-string"
  }
}
```

---

### GET /api/history

Lấy danh sách generation history.

**Query Params:**
| Param | Type | Default |
|-------|------|---------|
| limit | number | 50 |
| offset | number | 0 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sourceCode": "...",
      "generatedTests": "...",
      "framework": "pytest",
      "language": "python",
      "generationTime": 2500,
      "createdAt": "2024-12-17T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 100
  }
}
```

---

### GET /api/history/:id

Lấy chi tiết một generation.

### DELETE /api/history/:id

Xóa một generation khỏi history.

---

### GET /api/health

Health check endpoint.

```json
{
  "status": "ok",
  "timestamp": "2024-12-17T10:00:00Z",
  "version": "1.0.0"
}
```

---

## 🧠 Services

### TestGenerator (services/testGenerator.js)

Core logic để generate tests.

```javascript
class TestGenerator {
    async generateTests({ code, specs, framework, language }) {
        // 1. Build prompt
        const prompt = buildTestGenerationPrompt({ code, specs, framework, language });
        
        // 2. Call LLM API
        const rawResponse = await llmClient.generateText(prompt);
        
        // 3. Extract code from markdown
        const codeBlocks = extractCodeBlocks(rawResponse, language);
        const testCode = codeBlocks[0] || rawResponse;
        
        // 4. Validate
        const isValid = this._validateCode(testCode, language);
        
        return {
            generatedTests: testCode,
            rawResponse,
            framework,
            language,
            generationTime,
            isValid,
        };
    }
}
```

**Validation:**
- Python: kiểm tra có `def test_`, `class Test`, `assert`
- JavaScript/TypeScript: kiểm tra có `describe(`, `it(`, `test(`, `expect(`

---

### LLMClient (services/llmClient.js)

Multi-provider client hỗ trợ cả Gemini và Deepseek.

```javascript
class LLMClient {
    async generateText(prompt, options = {}) {
        const provider = options.provider || config.llm.provider;
        
        switch (provider.toLowerCase()) {
            case 'gemini':
                return this._callGemini(prompt, options);
            case 'deepseek':
            default:
                return this._callDeepseek(prompt, options);
        }
    }
}
```

**Features:**
- Retry logic (max 3 attempts)
- Exponential backoff
- Error handling với status codes
- Timeout: 120 seconds

**API Endpoints:**
| Provider | URL | Auth |
|----------|-----|------|
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | API key in URL |
| Deepseek | `https://api.deepseek.com/v1/chat/completions` | Bearer token |

---

## 💾 Database Model

### Generation Model (models/index.js)

```javascript
const Generation = sequelize.define('Generation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    sourceCode: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    specs: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    generatedTests: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    framework: {
        type: DataTypes.STRING,
        defaultValue: 'pytest',
    },
    language: {
        type: DataTypes.STRING,
        defaultValue: 'python',
    },
    generationTime: {
        type: DataTypes.INTEGER,  // milliseconds
        allowNull: true,
    },
    isValid: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'generations',
    timestamps: true,  // createdAt, updatedAt
});
```

---

## 📝 Prompt Engineering (utils/prompts.js)

### buildTestGenerationPrompt()

Xây dựng prompt tối ưu cho LLM.

**System Instructions:**
```
You are an expert software engineer and test writer.
Generate high-quality, minimal, and maintainable unit tests.
Cover normal cases, edge cases, and error handling.
Follow best practices for the specified testing framework.
```

**Framework-specific guides:**
| Framework | Guidelines |
|-----------|------------|
| pytest | Use fixtures, assert statements |
| unittest | Extend TestCase, use self.assertEqual |
| jest | Use describe/it, expect() |
| mocha | Use describe/it with Chai |

### extractCodeBlocks()

Extract code từ markdown response.

```javascript
// Input: "```python\nimport pytest...\n```"
// Output: ["import pytest..."]
```

---

## 🔄 Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          REQUEST                                 │
│                    POST /api/generate                            │
│         { code, specs, framework, language }                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                      routes/generate.js                         │
│  1. Validate input                                              │
│  2. Call testGenerator.generateTests()                          │
│  3. Save to database (optional)                                 │
│  4. Return response                                             │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                  services/testGenerator.js                      │
│  1. Build prompt (utils/prompts.js)                             │
│  2. Call llmClient.generateText()                               │
│  3. Extract code blocks                                         │
│  4. Validate generated code                                     │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                    services/llmClient.js                        │
│  1. Select provider (gemini/deepseek)                           │
│  2. Make HTTP request with retry                                │
│  3. Parse response                                              │
└────────────────────────────┬───────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       ┌────────────┐               ┌────────────┐
       │   Gemini   │               │  Deepseek  │
       │    API     │               │    API     │
       └────────────┘               └────────────┘
```

---

## 🏃 Scripts

```json
{
  "start": "node src/index.js",
  "dev": "nodemon src/index.js",
  "test": "jest"
}
```

| Script | Mô tả |
|--------|-------|
| `npm start` | Production mode |
| `npm run dev` | Development với hot reload |
| `npm test` | Run Jest tests |

---

## 🐳 Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["node", "src/index.js"]
```

---

## 📦 Dependencies

### Production
```json
{
  "axios": "^1.6.0",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "sequelize": "^6.35.0",
  "sqlite3": "^5.1.6",
  "uuid": "^9.0.0"
}
```

### Dev Dependencies
```json
{
  "jest": "^29.7.0",
  "nodemon": "^3.0.1"
}
```

---

## 🔐 Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "stack": "..." // only in development
}
```

### HTTP Status Codes
| Code | Mô tả |
|------|-------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 📊 Logging

Console logging với timestamps:
```
2024-12-17T10:00:00.000Z - POST /api/generate
📝 Generating pytest tests for python code...
🔄 [gemini] API request attempt 1/3
✅ Tests generated in 2500ms
```

---

*Xem thêm: [HUONG_DAN_KY_THUAT.md](./HUONG_DAN_KY_THUAT.md) | [frontend.md](./frontend.md)*
