# Hướng Dẫn Kỹ Thuật - LLM Unit Test Generator

## Giới Thiệu

Ứng dụng sử dụng **Large Language Model (Deepseek)** để tự động tạo unit tests cho code. Người dùng chỉ cần nhập code nguồn, hệ thống sẽ phân tích và tạo ra các test cases bao gồm:

- ✅ Test cho các trường hợp bình thường
- ✅ Test cho các edge cases (giá trị biên)
- ✅ Test cho xử lý lỗi và exceptions

---

## Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│                    (React + Vite)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Code Editor │  │ Test Output │  │   History View      │  │
│  │  (Monaco)   │  │   Panel     │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
┌────────────────────────▼────────────────────────────────────┐
│                        Backend                              │
│                  (Node.js + Express)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │  Services   │  │      Models         │  │
│  │ /api/...    │──│ Generator   │──│   (Sequelize)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Deepseek │    │  SQLite  │    │  Config  │
   │   API    │    │ Database │    │   .env   │
   └──────────┘    └──────────┘    └──────────┘
```

---

## Cài Đặt và Chạy

### Yêu Cầu Hệ Thống

- **Node.js** >= 18.0
- **npm** >= 9.0
- **Deepseek API Key** (lấy tại https://platform.deepseek.com)

### Bước 1: Clone Repository

```bash
git clone <repository-url>
cd LLM-Unit-tests
```

### Bước 2: Cài Đặt Backend

```bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file cấu hình
cp .env.example .env

# Chỉnh sửa file .env và thêm DEEPSEEK_API_KEY
notepad .env  # Windows
nano .env     # Linux/Mac
```

### Bước 3: Cài Đặt Frontend

```bash
cd ../frontend

# Cài đặt dependencies
npm install
```

### Bước 4: Chạy Ứng Dụng

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server chạy tại: http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Mở trình duyệt tại: http://localhost:5173
```

---

## API Reference

### Generate Tests

```http
POST /api/generate
Content-Type: application/json

{
  "code": "def add(a, b): return a + b",
  "specs": "Function should handle negative numbers",
  "framework": "pytest",
  "language": "python"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generatedTests": "import pytest\n\ndef test_add()...",
    "framework": "pytest",
    "generationTime": 2500,
    "isValid": true,
    "id": "uuid-here"
  }
}
```

### Get History

```http
GET /api/history?limit=50&offset=0
```

### Delete History Item

```http
DELETE /api/history/:id
```

### Health Check

```http
GET /api/health
```

---

## Cấu Hình

### Biến Môi Trường (.env)

| Tên | Mô tả | Mặc định |
|-----|-------|----------|
| `DEEPSEEK_API_KEY` | API key từ Deepseek | (bắt buộc) |
| `DEEPSEEK_API_URL` | URL của Deepseek API | https://api.deepseek.com/v1 |
| `DEEPSEEK_MODEL` | Model sử dụng | deepseek-coder |
| `PORT` | Port cho backend | 8000 |
| `MAX_TOKENS` | Token tối đa cho response | 2048 |
| `TEMPERATURE` | Độ sáng tạo (0-1) | 0.7 |

---

## Cấu Trúc Thư Mục

```
LLM-Unit-tests/
├── frontend/                # React Frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Trang (Home, History)
│   │   ├── services/        # API calls
│   │   └── styles/          # CSS
│   └── package.json
│
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── config/          # Cấu hình
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database models
│   │   └── utils/           # Utilities
│   └── package.json
│
├── docs/                    # Tài liệu
└── README.md
```

---

## Deploy lên Google Cloud VM

### 1. Chuẩn bị VM

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Cài đặt PM2 (process manager)
sudo npm install -g pm2

# Cài đặt Nginx
sudo apt install -y nginx
```

### 2. Clone và Build

```bash
# Clone project
cd /var/www
git clone <repository-url> llm-unit-tests
cd llm-unit-tests

# Setup Backend
cd backend
npm install
cp .env.example .env
# Chỉnh sửa .env với API key

# Setup Frontend
cd ../frontend
npm install
npm run build
```

### 3. Cấu hình PM2 (Backend)

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

    # Backend API
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
# Kích hoạt cấu hình
sudo ln -s /etc/nginx/sites-available/llm-unit-tests /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Xử Lý Sự Cố

### Lỗi: "DEEPSEEK_API_KEY is not set"

- Kiểm tra file `.env` trong thư mục `backend/`
- Đảm bảo có dòng: `DEEPSEEK_API_KEY=sk-your-key-here`

### Lỗi: "Failed to generate tests"

- Kiểm tra API key còn hiệu lực
- Kiểm tra kết nối internet
- Xem logs: `pm2 logs llm-backend`

### Lỗi: "Cannot connect to backend"

- Kiểm tra backend đang chạy: `pm2 status`
- Kiểm tra port 8000 không bị block bởi firewall

---

## Liên Hệ & Hỗ Trợ

- **Email**: support@example.com
- **GitHub Issues**: [Link đến repository]

---

*Tài liệu này được cập nhật lần cuối: Tháng 12/2024*
