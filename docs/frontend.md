# Frontend Documentation

## 🎯 Tổng Quan

Frontend được xây dựng với **React 18 + Vite 5**, sử dụng **Monaco Editor** (editor của VS Code) để hiển thị và chỉnh sửa code.

### Tech Stack
| Công nghệ | Version | Mục đích |
|-----------|---------|----------|
| React | 18.2 | UI Framework |
| Vite | 5.0 | Build tool |
| Monaco Editor | 4.6 | Code editor |
| Axios | 1.6 | HTTP client |
| React Hot Toast | 2.4 | Notifications |
| React Icons | 5.0 | Icon library |

---

## 📂 Cấu Trúc Source

```
frontend/src/
├── App.jsx              # Root component + routing
├── main.jsx             # Entry point (ReactDOM.createRoot)
├── components/
│   ├── CodeEditor.jsx   # Monaco Editor wrapper
│   └── Header.jsx       # Navigation header
├── pages/
│   ├── Home.jsx         # Main generation page
│   └── History.jsx      # View past generations
├── services/
│   └── api.js           # Axios API client
└── styles/
    └── index.css        # Global CSS styles
```

---

## 🧩 Components Chi Tiết

### App.jsx
Root component quản lý navigation bằng state thủ công (không dùng React Router).

```jsx
const [currentPage, setCurrentPage] = useState('home');

// Render based on currentPage
{currentPage === 'home' ? <Home /> : <History />}
```

**Tính năng:**
- Toast notifications với `react-hot-toast`
- Dark theme styling
- Footer với credits

---

### CodeEditor.jsx
Wrapper cho `@monaco-editor/react`, cấu hình sẵn cho code editing.

**Props:**
| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| value | string | - | Nội dung code |
| onChange | function | - | Callback khi code thay đổi |
| language | string | 'python' | Ngôn ngữ syntax highlighting |
| readOnly | boolean | false | Chỉ đọc |

**Config:**
- Theme: `vs-dark`
- Font: JetBrains Mono / Fira Code
- Features: line numbers, word wrap, smooth scrolling

---

### Header.jsx
Navigation bar với 2 tabs: **Home** và **History**.

**Props:**
| Prop | Type | Mô tả |
|------|------|-------|
| currentPage | string | Tab đang active |
| setCurrentPage | function | Callback đổi tab |

---

### Home.jsx
Trang chính để generate unit tests.

**State:**
```jsx
const [code, setCode] = useState(SAMPLE_CODE);      // Source code
const [specs, setSpecs] = useState('');             // Optional specs
const [framework, setFramework] = useState('pytest');
const [language, setLanguage] = useState('python');
const [generatedTests, setGeneratedTests] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [generationTime, setGenerationTime] = useState(null);
```

**Features:**
- Language selector: Python, JavaScript, TypeScript
- Framework selector: pytest, unittest, Jest, Mocha
- Sample code pre-filled
- Copy to clipboard
- Download as file
- Loading animation

**Flow:**
1. User nhập code vào editor trái
2. (Optional) Thêm specifications
3. Click "Generate Unit Tests"
4. Gọi API `/api/generate`
5. Hiển thị tests ở editor phải

---

### History.jsx
Trang xem lịch sử các lần generate.

**State:**
```jsx
const [history, setHistory] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [selectedItem, setSelectedItem] = useState(null);
```

**Features:**
- List view với badges (framework, language)
- Filter by time
- Modal view chi tiết
- Delete generation
- Copy/Download từ modal

---

## 🔌 API Service

### services/api.js

Axios client với base URL configurable qua environment variable.

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
```

**Functions:**

| Function | Method | Endpoint | Mô tả |
|----------|--------|----------|-------|
| `generateTests(params)` | POST | /generate | Tạo unit tests |
| `getHistory(limit, offset)` | GET | /history | Lấy danh sách |
| `getGeneration(id)` | GET | /history/:id | Lấy chi tiết |
| `deleteGeneration(id)` | DELETE | /history/:id | Xóa generation |
| `healthCheck()` | GET | /health | Health check |

**Config:**
- Timeout: 120s (2 phút cho LLM calls)
- Content-Type: application/json

---

## 🎨 Styling

### CSS Variables (index.css)

```css
:root {
    --bg-primary: #0a0a1a;
    --bg-secondary: #12122a;
    --text-primary: #ffffff;
    --text-muted: #94a3b8;
    --accent-purple: #8b5cf6;
    --accent-cyan: #06b6d4;
    --border-subtle: rgba(148, 163, 184, 0.1);
}
```

### Key Classes
| Class | Mô tả |
|-------|-------|
| `.panel` | Card container |
| `.btn-primary` | Purple gradient button |
| `.btn-secondary` | Transparent border button |
| `.editor-container` | Monaco editor wrapper |
| `.loading-pulse` | Loading animation |
| `.modal-backdrop` | Modal overlay |
| `.badge` | Tag/label styling |

---

## ⚙️ Build & Development

### Development
```bash
npm run dev
# → http://localhost:5173
```

### Production Build
```bash
npm run build
# Output: dist/
```

### Preview Production
```bash
npm run preview
```

### Environment Variables
| Variable | Mô tả | Default |
|----------|-------|---------|
| VITE_API_URL | Backend API URL | /api |

---

## 📦 Dependencies

### Production
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@monaco-editor/react": "^4.6.0",
  "axios": "^1.6.0",
  "react-hot-toast": "^2.4.1",
  "react-icons": "^5.0.1"
}
```

### Dev Dependencies
```json
{
  "@vitejs/plugin-react": "^4.2.1",
  "vite": "^5.0.8"
}
```

---

## 🐳 Docker

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

---

## 🔄 Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  User Input │ ──▶ │   Home.jsx   │ ──▶ │   api.js    │
│  (Monaco)   │     │ handleGenerate│     │ generateTests│
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                           ┌─────────────────────┼──────────────────────┐
                           │                     ▼                      │
                           │            Backend /api/generate           │
                           │                     │                      │
                           │                     ▼                      │
                           │              LLM API Call                  │
                           │                     │                      │
                           │                     ▼                      │
                           └─────────────────────┼──────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────┐
                    │                                                          │
                    ▼                                                          ▼
           ┌──────────────┐                                          ┌──────────────┐
           │ Update State │                                          │ Save History │
           │generatedTests│                                          │   (SQLite)   │
           └──────────────┘                                          └──────────────┘
```

---

*Xem thêm: [HUONG_DAN_KY_THUAT.md](./HUONG_DAN_KY_THUAT.md) | [backend.md](./backend.md)*
