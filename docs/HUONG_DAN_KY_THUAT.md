# Hướng Dẫn Kỹ Thuật - LLM Unit Test Generator

## 📋 Giới Thiệu

**LLM Unit Test Generator** là ứng dụng web sử dụng AI (Deepseek hoặc Google Gemini) để tự động tạo unit tests từ source code. 

### Tính Năng Chính
- ✅ Tạo tests tự động cho **Python, JavaScript, TypeScript**
- ✅ Hỗ trợ **pytest, unittest, Jest, Mocha**
- ✅ Giao diện modern với **Monaco Editor** (VS Code editor)
- ✅ Lưu lịch sử generation
- ✅ Copy / Download tests trực tiếp

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    React 18 + Vite 5                            │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────┐   │
│  │ Monaco Editor│  │   Home Page   │  │   History Page      │   │
│  │  (CodeEditor)│  │ (Generate UI) │  │ (View past tests)   │   │
│  └──────────────┘  └───────────────┘  └─────────────────────┘   │
│                              │                                   │
│                    ┌─────────▼──────────┐                        │
│                    │  API Service       │                        │
│                    │  (axios client)    │                        │
│                    └─────────┬──────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTP REST API (JSON)
┌──────────────────────────────▼──────────────────────────────────┐
│                         BACKEND                                  │
│                   Node.js + Express 4                            │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────┐   │
│  │   Routes     │  │   Services    │  │      Models         │   │
│  │ /generate    │──│ TestGenerator │──│   Generation        │   │
│  │ /history     │  │ LLMClient     │  │   (Sequelize)       │   │
│  │ /health      │  └───────────────┘  └─────────────────────┘   │
│  └──────────────┘                                                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
   ┌──────────┐          ┌──────────┐          ┌──────────┐
   │ Gemini   │          │ Deepseek │          │  SQLite  │
   │   API    │    OR    │   API    │          │ Database │
   └──────────┘          └──────────┘          └──────────┘
```

---

## 📂 Cấu Trúc Thư Mục

```
LLM-Unit-tests/
├── frontend/                    # React Frontend
│   ├── src/
│   │   ├── App.jsx             # Main app với routing thủ công
│   │   ├── main.jsx            # Entry point
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx  # Monaco Editor wrapper
│   │   │   └── Header.jsx      # Navigation header
│   │   ├── pages/
│   │   │   ├── Home.jsx        # Trang generate tests
│   │   │   └── History.jsx     # Trang xem lịch sử
│   │   ├── services/
│   │   │   └── api.js          # Axios HTTP client
│   │   └── styles/
│   │       └── index.css       # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                     # Node.js Backend
│   ├── src/
│   │   ├── index.js            # Express server entry
│   │   ├── config/
│   │   │   └── index.js        # Environment config
│   │   ├── routes/
│   │   │   ├── generate.js     # POST /api/generate
│   │   │   └── history.js      # GET/DELETE /api/history
│   │   ├── services/
│   │   │   ├── testGenerator.js  # Core generation logic
│   │   │   ├── llmClient.js      # Multi-provider LLM client
│   │   │   └── deepseekClient.js # Deepseek-specific (legacy)
│   │   ├── models/
│   │   │   └── index.js        # Sequelize models
│   │   └── utils/
│   │       └── prompts.js      # Prompt engineering
│   ├── .env.example
│   └── package.json
│
├── docs/                        # Tài liệu
│   ├── HUONG_DAN_KY_THUAT.md
│   ├── frontend.md
│   └── backend.md
├── docker-compose.yml
└── README.md
```

---

## 🚀 Cài Đặt & Chạy

### Yêu Cầu Hệ Thống
| Yêu cầu | Phiên bản |
|---------|-----------|
| Node.js | >= 18.0 |
| npm | >= 9.0 |
| API Key | Gemini hoặc Deepseek |

### Bước 1: Clone Repository
```bash
git clone <repository-url>
cd LLM-Unit-tests
```

### Bước 2: Cài Đặt Backend
```bash
cd backend
npm install
cp .env.example .env
```

Chỉnh sửa file `.env`:
```env
# Chọn provider: gemini hoặc deepseek
LLM_PROVIDER=gemini

# Google Gemini API (khuyến nghị)
GEMINI_API_KEY=your_gemini_api_key

# Hoặc Deepseek API
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### Bước 3: Cài Đặt Frontend
```bash
cd ../frontend
npm install
```

### Bước 4: Chạy Ứng Dụng

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# 🚀 Server: http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# 🌐 Web: http://localhost:5173
```

---

## 📡 API Reference

### POST /api/generate
Tạo unit tests từ source code.

**Request:**
```json
{
  "code": "def add(a, b): return a + b",
  "specs": "Handle negative numbers",
  "framework": "pytest",
  "language": "python",
  "saveHistory": true
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "generatedTests": "import pytest\n\ndef test_add()...",
    "framework": "pytest",
    "language": "python",
    "generationTime": 2500,
    "isValid": true,
    "id": "uuid-string"
  }
}
```

### GET /api/history
Lấy danh sách generation history.

| Param | Type | Default | Mô tả |
|-------|------|---------|-------|
| limit | number | 50 | Số lượng records |
| offset | number | 0 | Bắt đầu từ record thứ |

### GET /api/history/:id
Lấy chi tiết một generation.

### DELETE /api/history/:id
Xóa một generation khỏi history.

### GET /api/health
Health check endpoint.

---

## ⚙️ Cấu Hình

### Biến Môi Trường (.env)

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| **LLM_PROVIDER** | `gemini` hoặc `deepseek` | gemini |
| **GEMINI_API_KEY** | Google Gemini API key | - |
| **DEEPSEEK_API_KEY** | Deepseek API key | - |
| **PORT** | Port backend | 8000 |
| **MAX_TOKENS** | Max tokens response | 4096 |
| **TEMPERATURE** | LLM creativity (0-1) | 0.7 |
| **DATABASE_URL** | SQLite database path | sqlite:./database.sqlite |

---

## 🐳 Docker Deployment

```bash
docker-compose up -d
```

Hoặc build riêng:
```bash
# Build backend
cd backend && docker build -t llm-backend .

# Build frontend  
cd frontend && docker build -t llm-frontend .
```

---

## ☁️ Deploy lên Google Cloud VM

### 1. Chuẩn bị VM
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Cài đặt PM2 (process manager)
sudo npm install -g pm2

# Cài đặt Nginx
sudo apt install -y nginx
```

### 2. Clone & Build
```bash
cd /var/www
git clone <repo-url> llm-unit-tests
cd llm-unit-tests

# Backend
cd backend
npm install
cp .env.example .env
nano .env  # Thêm API key

# Frontend
cd ../frontend
npm install
npm run build
```

### 3. Cấu hình PM2
```bash
cd /var/www/llm-unit-tests/backend
pm2 start src/index.js --name "llm-backend"
pm2 save
pm2 startup
```

### 4. Cấu hình Nginx
```nginx
# /etc/nginx/sites-available/llm-unit-tests
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (static files)
    location / {
        root /var/www/llm-unit-tests/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/llm-unit-tests /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔧 Xử Lý Sự Cố

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `API key not set` | Chưa cấu hình env | Kiểm tra `.env` file |
| `Failed to generate` | API key hết hạn/sai | Kiểm tra API key còn hợp lệ |
| `Cannot connect to backend` | Backend chưa chạy | `pm2 status` để kiểm tra |
| `CORS error` | Frontend gọi sai URL | Kiểm tra `VITE_API_URL` |

### Xem Logs
```bash
# PM2 logs
pm2 logs llm-backend

# Nginx logs
tail -f /var/log/nginx/error.log
```

---

## 📚 Tài Liệu Chi Tiết

- [Frontend Documentation](./frontend.md)
- [Backend Documentation](./backend.md)

---

*Cập nhật lần cuối: Tháng 12/2024*
