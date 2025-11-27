# LLM-Unit-Tests - Hướng Dẫn Tiếng Việt

## 📖 Giới Thiệu Dự Án

**LLM-Unit-Tests** là một ứng dụng thông minh sử dụng Trí Tuệ Nhân Tạo (AI) để tự động tạo ra các bài test (kiểm thử) cho mã nguồn Python.

### Mục Đích
Thay vì viết test thủ công, bạn chỉ cần cung cấp:
- Đoạn mã nguồn cần kiểm thử
- Các yêu cầu/thông số kỹ thuật (tùy chọn)
- Loại framework test muốn dùng (pytest, unittest)

Hệ thống sẽ tự động tạo ra các bài test toàn diện.

### Ví Dụ
```python
# Input: Mã nguồn cần test
def add(a, b):
    return a + b

# Output: Bài test được tạo tự động
def test_add_hai_so_duong():
    assert add(2, 3) == 5

def test_add_hai_so_am():
    assert add(-1, -2) == -3

def test_add_voi_zero():
    assert add(0, 5) == 5
```

---

## 🎯 Quy Tắc Hoạt Động

### 1. Quy Trình Chính
```
┌─────────────────────────────────────────────────────┐
│ 1. Người dùng cung cấp mã nguồn                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Hệ thống phân tích mã (Code Analyzer)            │
│    - Tìm các hàm (function)                         │
│    - Tìm các lớp (class)                            │
│    - Tạo tóm tắt cấu trúc                          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Xây dựng prompt tối ưu (Prompt Engineer)         │
│    - Thêm hướng dẫn hệ thống                        │
│    - Thêm mã cần test                              │
│    - Thêm yêu cầu chi tiết                         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Gọi API Deepseek (LLM)                           │
│    - Gửi prompt tới AI                             │
│    - Nhận kết quả từ AI                            │
│    - Xử lý lỗi & retry                             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. Xử lý kết quả                                    │
│    - Trích xuất code từ markdown                    │
│    - Kiểm tra tính hợp lệ của code                 │
│    - Lưu vào file                                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. Trả về bài test cho người dùng                   │
└─────────────────────────────────────────────────────┘
```

### 2. Các Thành Phần Chính

#### A. Config (Cấu Hình)
- **Tác dụng:** Quản lý cấu hình ứng dụng
- **Chức năng:**
  - Đọc API key từ file `.env`
  - Kiểm tra các cài đặt bắt buộc
  - Cung cấp giá trị mặc định
  - Xác thực cấu hình

#### B. API Client (Khách Hàng API)
- **Tác dụng:** Giao tiếp với API Deepseek
- **Chức năng:**
  - Gửi yêu cầu tới API
  - Xử lý timeout (quá thời gian)
  - Thử lại nếu lỗi (retry logic)
  - Quản lý phiên làm việc

#### C. Code Analyzer (Phân Tích Mã)
- **Tác dụng:** Phân tích cấu trúc mã Python
- **Chức năng:**
  - Tìm các hàm (function)
  - Tìm các lớp (class)
  - Trích xuất thông tin phương thức
  - Tạo tóm tắt mã

#### D. Prompt Engineer (Kỹ Sư Prompt)
- **Tác dụng:** Xây dựng prompt tối ưu cho AI
- **Chức năng:**
  - Tạo hướng dẫn hệ thống
  - Định dạng mã cần test
  - Thêm yêu cầu chi tiết
  - Chỉ định framework test

#### E. Test Generator (Bộ Tạo Test)
- **Tác dụng:** Điều phối toàn bộ quy trình
- **Chức năng:**
  - Gọi các thành phần khác
  - Tạo test từ mã
  - Lưu test vào file
  - Xác thực kết quả

#### F. Utils (Tiện Ích)
- **Tác dụng:** Hàm trợ giúp chung
- **Chức năng:**
  - Đọc/ghi file
  - Kiểm tra code Python
  - Trích xuất code từ markdown
  - Xử lý chuỗi văn bản

---

## 🧪 Các Bài Test

### Tổng Quan
- **Tổng số test:** 13
- **Trạng thái:** ✅ Tất cả đều PASS
- **Thời gian chạy:** ~1.5 giây

### Chi Tiết Các Test

#### 1. Test API Client (2 tests)
**File:** `tests/test_api_client.py`

```python
✅ test_generate_text_success
   - Kiểm tra: Gọi API thành công
   - Cách test: Giả lập (mock) phản hồi HTTP
   - Kết quả mong đợi: Trả về "hello"

✅ test_generate_text_retry_then_success
   - Kiểm tra: Logic thử lại khi lỗi
   - Cách test: Giả lập timeout lần đầu, thành công lần 2
   - Kết quả mong đợi: Trả về "after-retry"
```

**Ý nghĩa:**
- Đảm bảo API client có thể gọi API thành công
- Đảm bảo hệ thống có thể xử lý lỗi và thử lại

#### 2. Test Code Analyzer (2 tests)
**File:** `tests/test_code_analyzer.py`

```python
✅ test_parse_functions_and_classes
   - Kiểm tra: Phân tích mã Python
   - Cách test: Phân tích mã chứa hàm và lớp
   - Kết quả mong đợi: Tìm được hàm "add" và lớp "Greeter"

✅ test_summarize_source_outputs_lines
   - Kiểm tra: Tạo tóm tắt mã
   - Cách test: Tạo tóm tắt từ mã
   - Kết quả mong đợi: Tóm tắt chứa "Functions:" hoặc "Classes:"
```

**Ý nghĩa:**
- Đảm bảo hệ thống có thể phân tích cấu trúc mã
- Đảm bảo có thể tạo tóm tắt mã chính xác

#### 3. Test Config (2 tests)
**File:** `tests/test_config.py`

```python
✅ test_config_requires_api_key
   - Kiểm tra: Yêu cầu API key bắt buộc
   - Cách test: Cố gắng tạo config mà không có API key
   - Kết quả mong đợi: Ném lỗi ValueError

✅ test_config_loads_with_api_key
   - Kiểm tra: Tải cấu hình với API key
   - Cách test: Tạo config với API key hợp lệ
   - Kết quả mong đợi: Config được tạo thành công
```

**Ý nghĩa:**
- Đảm bảo hệ thống bắt buộc phải có API key
- Đảm bảo cấu hình được tải đúng

#### 4. Test Prompt Engineer (1 test)
**File:** `tests/test_prompt_engineer.py`

```python
✅ test_build_prompt_contains_sections
   - Kiểm tra: Xây dựng prompt chính xác
   - Cách test: Tạo prompt và kiểm tra nội dung
   - Kết quả mong đợi: Prompt chứa tất cả các phần cần thiết
```

**Ý nghĩa:**
- Đảm bảo prompt được xây dựng đầy đủ và chính xác

#### 5. Test Generator (2 tests)
**File:** `tests/test_test_generator.py`

```python
✅ test_generate_tests_extracts_code_block
   - Kiểm tra: Trích xuất code từ kết quả AI
   - Cách test: Tạo test và kiểm tra trích xuất
   - Kết quả mong đợi: Code được trích xuất đúng

✅ test_generate_and_save
   - Kiểm tra: Tạo test và lưu vào file
   - Cách test: Tạo test và lưu, kiểm tra file
   - Kết quả mong đợi: File được tạo thành công
```

**Ý nghĩa:**
- Đảm bảo test được tạo đúng
- Đảm bảo test được lưu vào file đúng

#### 6. Test Utils (4 tests)
**File:** `tests/test_utils.py`

```python
✅ test_write_and_read_file
   - Kiểm tra: Đọc/ghi file
   - Cách test: Ghi nội dung vào file, đọc lại
   - Kết quả mong đợi: Nội dung giống nhau

✅ test_validate_python_code
   - Kiểm tra: Kiểm tra code Python hợp lệ
   - Cách test: Kiểm tra code đúng và sai
   - Kết quả mong đợi: Trả về True/False đúng

✅ test_extract_code_blocks
   - Kiểm tra: Trích xuất code từ markdown
   - Cách test: Trích xuất từ markdown có code block
   - Kết quả mong đợi: Code được trích xuất đúng

✅ test_sanitize_and_truncate
   - Kiểm tra: Làm sạch tên file và cắt chuỗi
   - Cách test: Kiểm tra tên file và chuỗi dài
   - Kết quả mong đợi: Kết quả đúng định dạng
```

**Ý nghĩa:**
- Đảm bảo các hàm tiện ích hoạt động đúng
- Đảm bảo xử lý file và chuỗi chính xác

---

## 📊 Kết Quả Test

### Tóm Tắt
```
✅ Tổng số test: 13
✅ Đã PASS: 13
❌ Đã FAIL: 0
⏭️ Bỏ qua: 0
⚠️ Cảnh báo: 1 (không nghiêm trọng)

Thời gian chạy: 1.48 giây
```

### Chi Tiết Từng Module

| Module | Số Test | Trạng Thái | Mô Tả |
|--------|---------|-----------|-------|
| API Client | 2 | ✅ | Gọi API, retry logic |
| Code Analyzer | 2 | ✅ | Phân tích mã, tóm tắt |
| Config | 2 | ✅ | Tải cấu hình, xác thực |
| Prompt Engineer | 1 | ✅ | Xây dựng prompt |
| Test Generator | 2 | ✅ | Tạo test, lưu file |
| Utils | 4 | ✅ | Đọc/ghi, xử lý chuỗi |

---

## [object Object]ỗi Tìm Được & Sửa Chữa

### Lỗi 1: Syntax Error trong test_code_analyzer.py

**Vấn đề:**
```python
# ❌ SAI: Dấu ngoặc kép ba lần lồng nhau
source = """
class Greeter:
    def hello(self, name):
        """Say hello"""
        return f"Hello, {name}"
"""
```

**Nguyên nhân:**
- Sử dụng `"""` bên trong `"""` gây lỗi cú pháp

**Cách Sửa:**
```python
# ✅ ĐÚNG: Dùng dấu ngoặc đơn ba lần
source = """
class Greeter:
    def hello(self, name):
        '''Say hello'''
        return f"Hello, {name}"
"""
```

**Kết Quả:**
- ✅ Tất cả test đều PASS

---

## [object Object]ách Sử Dụng

### 1. Cài Đặt (5 phút)

**Bước 1: Cài đặt thư viện**
```bash
pip install -r requirements.txt
```

**Bước 2: Tạo file `.env`**
```
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-coder
MAX_TOKENS=2048
TEMPERATURE=0.7
TOP_P=0.95
DEBUG=false
LOG_LEVEL=INFO
```

**Bước 3: Kiểm tra cài đặt**
```bash
pytest tests/ -v
```

### 2. Sử Dụng Cơ Bản

```python
from src.test_generator import TestGenerator
from src.config import Config

# Khởi tạo
config = Config()
generator = TestGenerator(config)

# Mã cần test
code = """
def add(a, b):
    return a + b
"""

# Tạo test
tests = generator.generate_tests(code)
print(tests)
```

### 3. Sử Dụng Nâng Cao

```python
# Với yêu cầu chi tiết
specs = """
- Phải xử lý số dương
- Phải xử lý số âm
- Phải xử lý số 0
"""

tests = generator.generate_tests(
    code=code,
    specs=specs,
    framework="pytest"
)

# Lưu vào file
generator.generate_and_save(
    code=code,
    output_path="test_add.py",
    specs=specs,
    framework="pytest",
    overwrite=True
)
```

---

## 📋 Chạy Test

### Chạy Tất Cả Test
```bash
pytest tests/ -v
```

### Chạy Test Cụ Thể
```bash
# Chạy một file test
pytest tests/test_config.py -v

# Chạy một test cụ thể
pytest tests/test_config.py::test_config_loads_with_api_key -v
```

### Chạy Với Chi Tiết
```bash
# Hiển thị output
pytest tests/ -v -s

# Hiển thị thông tin chi tiết
pytest tests/ -v --tb=long
```

---

## [object Object]ấu Hình

### File `.env`
```
# API Configuration
DEEPSEEK_API_KEY=your_key_here          # Bắt buộc
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-coder

# Test Generation
MAX_TOKENS=2048                         # Số token tối đa
TEMPERATURE=0.7                         # Độ sáng tạo (0-2)
TOP_P=0.95                              # Xác suất hàng đầu (0-1)

# Application
DEBUG=false                             # Chế độ debug
LOG_LEVEL=INFO                          # Mức log
```

### Giải Thích Tham Số

| Tham Số | Ý Nghĩa | Giá Trị |
|---------|---------|--------|
| MAX_TOKENS | Độ dài tối đa của kết quả | 1-4096 |
| TEMPERATURE | Độ sáng tạo (cao = sáng tạo hơn) | 0-2 |
| TOP_P | Xác suất hàng đầu | 0-1 |

---

## [object Object]ưu Ý Quan Trọng

### Yêu Cầu
- Python 3.8 trở lên
- API key từ Deepseek
- Kết nối internet

### Giới Hạn
- Phải có API key hợp lệ
- Phải có kết nối internet
- Có thể bị giới hạn tốc độ từ API

### Tốt Nhất
- Kiểm tra test được tạo trước khi dùng
- Dùng specs chi tiết để có test tốt hơn
- Lưu test vào version control

---

## ✅ Kiểm Tra Cài Đặt

```bash
# 1. Kiểm tra Python
python --version

# 2. Cài đặt thư viện
pip install -r requirements.txt

# 3. Tạo file .env
# (Tạo file .env với DEEPSEEK_API_KEY)

# 4. Chạy test
pytest tests/ -v

# Kết quả mong đợi: 13 passed ✅
```

---

*Hướng Dẫn Tiếng Việt - 2025-11-27*

