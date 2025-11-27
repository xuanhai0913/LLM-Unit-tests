# Kiến Trúc & Quy Tắc Hoạt Động - LLM-Unit-Tests

## 🏗️ Kiến Trúc Hệ Thống

### Sơ Đồ Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                    NGƯỜI DÙNG                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              CLI / Python API                               │
│         (Giao diện dòng lệnh hoặc API Python)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          TEST GENERATOR (Bộ Tạo Test)                       │
│  - Điều phối toàn bộ quy trình                             │
│  - Gọi các thành phần khác                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    ┌────────┐    ┌──────────┐    ┌────────────┐
    │ CONFIG │    │ ANALYZER │    │ PROMPTER   │
    └────────┘    └──────────┘    └────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
                  ┌────────────────┐
                  │  API CLIENT    │
                  │  (Gọi Deepseek)│
                  └────────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ DEEPSEEK API   │
                  │ (LLM Service)  │
                  └────────────────┘
```

---

## 📦 Các Thành Phần Chi Tiết

### 1. Config (Cấu Hình)
**File:** `src/config.py`

**Chức Năng:**
- Đọc cấu hình từ file `.env`
- Xác thực cấu hình bắt buộc
- Cung cấp giá trị mặc định
- Quản lý tham số API

**Quy Trình:**
```
1. Đọc file .env
   ↓
2. Tải biến môi trường
   ↓
3. Xác thực API key (bắt buộc)
   ↓
4. Xác thực các tham số
   ↓
5. Trả về Config object
```

**Các Tham Số:**
```python
# Bắt buộc
DEEPSEEK_API_KEY = "your_key"

# Tùy chọn (có giá trị mặc định)
DEEPSEEK_API_URL = "https://api.deepseek.com/v1"
DEEPSEEK_MODEL = "deepseek-coder"
MAX_TOKENS = 2048
TEMPERATURE = 0.7
TOP_P = 0.95
DEBUG = false
LOG_LEVEL = "INFO"
```

**Xác Thực:**
- API key phải có
- MAX_TOKENS > 0
- TEMPERATURE: 0-2
- TOP_P: 0-1

---

### 2. API Client (Khách Hàng API)
**File:** `src/api_client.py`

**Chức Năng:**
- Giao tiếp với API Deepseek
- Xử lý lỗi và timeout
- Thử lại tự động (retry)
- Quản lý phiên làm việc

**Quy Trình Gọi API:**
```
1. Chuẩn bị payload
   - model: deepseek-coder
   - messages: [{"role": "user", "content": prompt}]
   - max_tokens: 2048
   - temperature: 0.7
   - top_p: 0.95

2. Gửi POST request
   ↓
3. Kiểm tra phản hồi
   ├─ Thành công (200) → Trích xuất kết quả
   ├─ Timeout → Thử lại
   └─ Lỗi khác → Thử lại

4. Retry Logic (Exponential Backoff)
   - Lần 1: Chờ 2^0 = 1 giây
   - Lần 2: Chờ 2^1 = 2 giây
   - Lần 3: Chờ 2^2 = 4 giây

5. Trả về kết quả hoặc ném lỗi
```

**Xử Lý Lỗi:**
```python
try:
    response = session.post(url, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]
except Timeout:
    # Thử lại
except RequestException:
    # Thử lại
```

---

### 3. Code Analyzer (Phân Tích Mã)
**File:** `src/code_analyzer.py`

**Chức Năng:**
- Phân tích cấu trúc mã Python
- Trích xuất hàm (function)
- Trích xuất lớp (class)
- Tạo tóm tắt mã

**Quy Trình Phân Tích:**
```
1. Parse mã Python bằng AST
   ↓
2. Duyệt qua các node
   ├─ FunctionDef → Thêm vào danh sách hàm
   └─ ClassDef → Thêm vào danh sách lớp

3. Trích xuất thông tin
   - Tên hàm/lớp
   - Tham số
   - Docstring
   - Phương thức (cho lớp)

4. Tạo tóm tắt
   - "Functions: add(a, b), multiply(x, y)"
   - "Classes: Calculator (methods: add, multiply)"
```

**Ví Dụ:**
```python
source = """
def add(a, b):
    return a + b

class Calculator:
    def multiply(self, x, y):
        return x * y
"""

funcs = parse_functions(source)
# [FunctionInfo(name='add', args=['a', 'b'], docstring=None)]

classes = parse_classes(source)
# [ClassInfo(name='Calculator', methods=[...], docstring=None)]

summary = summarize_source(source)
# "Functions:\n- add(a, b)\nClasses:\n- Calculator (methods: multiply)"
```

---

### 4. Prompt Engineer (Kỹ Sư Prompt)
**File:** `src/prompt_engineer.py`

**Chức Năng:**
- Xây dựng prompt tối ưu cho AI
- Định dạng mã cần test
- Thêm yêu cầu chi tiết
- Chỉ định framework test

**Cấu Trúc Prompt:**
```
┌─────────────────────────────────────────┐
│ 1. SYSTEM INSTRUCTIONS                  │
│    "Bạn là một chuyên gia viết test..."  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 2. FRAMEWORK HINT                       │
│    "Viết test bằng pytest..."            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 3. SPECIFICATIONS (nếu có)              │
│    "- Phải xử lý số dương"              │
│    "- Phải xử lý số âm"                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 4. CODE UNDER TEST                      │
│    ```python                            │
│    def add(a, b):                       │
│        return a + b                     │
│    ```                                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 5. OUTPUT REQUIREMENTS                  │
│    "Chỉ output code Python..."          │
└─────────────────────────────────────────┘
```

**Ví Dụ Prompt:**
```
System: Bạn là một chuyên gia viết test...

Viết test bằng pytest...

Specifications:
- Phải xử lý số dương
- Phải xử lý số âm

Code under test:
```python
def add(a, b):
    return a + b
```

Output ONLY Python code...
```

---

### 5. Test Generator (Bộ Tạo Test)
**File:** `src/test_generator.py`

**Chức Năng:**
- Điều phối toàn bộ quy trình
- Tạo test từ mã
- Xác thực kết quả
- Lưu test vào file

**Quy Trình Tạo Test:**
```
1. Nhận mã nguồn
   ↓
2. Xây dựng prompt (Prompt Engineer)
   ↓
3. Gọi API Deepseek (API Client)
   ↓
4. Nhận kết quả từ AI
   ↓
5. Trích xuất code từ markdown
   ├─ Tìm ```python ... ```
   └─ Lấy code bên trong
   ↓
6. Xác thực code Python
   ├─ Hợp lệ → Trả về
   └─ Không hợp lệ → Thêm comment
   ↓
7. Trả về hoặc lưu vào file
```

**Ví Dụ Sử Dụng:**
```python
generator = TestGenerator(config)

# Tạo test
tests = generator.generate_tests(
    code="def add(a, b): return a + b",
    specs="Test addition",
    framework="pytest"
)

# Lưu vào file
generator.generate_and_save(
    code="def add(a, b): return a + b",
    output_path="test_add.py",
    specs="Test addition",
    framework="pytest",
    overwrite=True
)
```

---

### 6. Utils (Tiện Ích)
**File:** `src/utils.py`

**Chức Năng:**
- Đọc/ghi file
- Xác thực code Python
- Trích xuất code từ markdown
- Xử lý chuỗi văn bản

**Các Hàm Chính:**

1. **read_file(path)** - Đọc file
   ```python
   content = read_file("test.py")
   ```

2. **write_file(path, content, overwrite=False)** - Ghi file
   ```python
   write_file("test.py", "def test(): pass")
   ```

3. **validate_python_code(code)** - Xác thực code
   ```python
   if validate_python_code(code):
       print("Code hợp lệ")
   ```

4. **extract_code_blocks(text, language="python")** - Trích xuất code
   ```python
   blocks = extract_code_blocks(markdown)
   ```

5. **sanitize_filename(filename)** - Làm sạch tên file
   ```python
   clean = sanitize_filename("test<file>.py")
   # "test_file_.py"
   ```

6. **truncate_string(text, max_length=100)** - Cắt chuỗi
   ```python
   short = truncate_string(long_text, 100)
   ```

---

## 🔄 Quy Trình Hoạt Động Chi Tiết

### Quy Trình Tạo Test Từ Đầu Đến Cuối

```
BƯỚC 1: KHỞI TẠO
├─ Tạo Config object
│  └─ Đọc .env, xác thực API key
├─ Tạo API Client object
│  └─ Thiết lập headers, session
└─ Tạo Test Generator object
   └─ Lưu config và client

BƯỚC 2: NHẬN INPUT
├─ Mã nguồn cần test
├─ Yêu cầu chi tiết (tùy chọn)
└─ Framework test (mặc định: pytest)

BƯỚC 3: PHÂN TÍCH MÃ
├─ Parse mã bằng AST
├─ Tìm các hàm
├─ Tìm các lớp
└─ Tạo tóm tắt

BƯỚC 4: XÂY DỰNG PROMPT
├─ Thêm hướng dẫn hệ thống
├─ Thêm framework hint
├─ Thêm specifications
├─ Thêm mã cần test
└─ Thêm output requirements

BƯỚC 5: GỌI API
├─ Chuẩn bị payload
├─ Gửi POST request
├─ Xử lý phản hồi
├─ Nếu lỗi → Thử lại (max 3 lần)
└─ Trả về kết quả

BƯỚC 6: XỬ LÝ KẾT QUẢ
├─ Trích xuất code từ markdown
├─ Xác thực code Python
├─ Nếu không hợp lệ → Thêm comment
└─ Trả về code

BƯỚC 7: LƯU VÀO FILE (tùy chọn)
├─ Tạo thư mục nếu cần
├─ Kiểm tra file tồn tại
├─ Ghi nội dung
└─ Trả về đường dẫn file

BƯỚC 8: TRẢ VỀ KẾT QUẢ
└─ Trả về test code cho người dùng
```

---

## ⚙️ Cơ Chế Xử Lý Lỗi

### 1. Lỗi Cấu Hình
```
Lỗi: DEEPSEEK_API_KEY không có
Xử lý: Ném ValueError
Thông báo: "DEEPSEEK_API_KEY environment variable is required"
```

### 2. Lỗi API
```
Lỗi: Timeout
Xử lý: Thử lại với exponential backoff
Max retry: 3 lần

Lỗi: HTTP error (4xx, 5xx)
Xử lý: Thử lại
Max retry: 3 lần
```

### 3. Lỗi Code
```
Lỗi: Code Python không hợp lệ
Xử lý: Thêm comment "# Generated tests (raw)"
```

### 4. Lỗi File
```
Lỗi: File tồn tại
Xử lý: Ném FileExistsError (nếu overwrite=False)

Lỗi: Thư mục không tồn tại
Xử lý: Tạo thư mục tự động
```

---

## 📊 Luồng Dữ Liệu

```
Người dùng
    │
    ├─ code: str
    ├─ specs: str (tùy chọn)
    └─ framework: str
    
    ▼
    
Test Generator
    │
    ├─→ Code Analyzer
    │   └─ Trả về: summary
    │
    ├─→ Prompt Engineer
    │   └─ Trả về: prompt
    │
    ├─→ API Client
    │   └─ Trả về: raw_response
    │
    ├─→ Utils (extract_code_blocks)
    │   └─ Trả về: test_code
    │
    └─→ Utils (validate_python_code)
        └─ Trả về: is_valid
    
    ▼
    
Kết quả
    ├─ test_code: str
    └─ output_path: str (nếu lưu file)
```

---

## 🎯 Các Quy Tắc Quan Trọng

### 1. Quy Tắc API Key
- ✅ Bắt buộc phải có
- ✅ Lưu trong file `.env`
- ✅ Không commit vào git
- ✅ Được xác thực khi khởi tạo Config

### 2. Quy Tắc Retry
- ✅ Tối đa 3 lần thử
- ✅ Exponential backoff (1s, 2s, 4s)
- ✅ Chỉ retry khi timeout hoặc lỗi tạm thời
- ✅ Không retry khi lỗi 4xx

### 3. Quy Tắc Code Validation
- ✅ Kiểm tra code Python hợp lệ
- ✅ Nếu không hợp lệ, thêm comment
- ✅ Không ném lỗi, trả về code

### 4. Quy Tắc File I/O
- ✅ Tạo thư mục tự động
- ✅ Không ghi đè nếu overwrite=False
- ✅ Sử dụng UTF-8 encoding
- ✅ Xử lý lỗi file

### 5. Quy Tắc Prompt
- ✅ Luôn có system instructions
- ✅ Luôn có framework hint
- ✅ Luôn có code under test
- ✅ Luôn có output requirements

---

*Kiến Trúc & Quy Tắc Hoạt Động - 2025-11-27*

