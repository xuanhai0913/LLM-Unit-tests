# Chi Tiết Các Test - LLM-Unit-Tests

## 📋 Tổng Quan

**Tổng số test:** 13  
**Trạng thái:** ✅ Tất cả PASS  
**Thời gian:** ~1.5 giây  
**Cảnh báo:** 1 (không nghiêm trọng)

---

## 🧪 Test 1: API Client Tests (2 tests)

### File: `tests/test_api_client.py`

#### Test 1.1: `test_generate_text_success`

**Mục đích:** Kiểm tra gọi API thành công

**Mã test:**
```python
def test_generate_text_success(monkeypatch):
    # 1. Thiết lập API key
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    cfg = Config(load_env=False)
    client = DeepseekAPIClient(cfg)
    
    # 2. Giả lập phản hồi HTTP
    def fake_post(url, json=None, timeout=30):
        return DummyResponse(200, {
            "choices": [{"message": {"content": "hello"}}]
        })
    
    # 3. Thay thế phương thức post
    monkeypatch.setattr(client.session, "post", fake_post)
    
    # 4. Gọi hàm
    out = client.generate_text("hi")
    
    # 5. Kiểm tra kết quả
    assert out == "hello"
```

**Quy trình:**
1. Tạo client API với API key giả
2. Giả lập phản hồi HTTP thành công
3. Gọi `generate_text()`
4. Kiểm tra kết quả là "hello"

**Kết quả:** ✅ PASS

---

#### Test 1.2: `test_generate_text_retry_then_success`

**Mục đích:** Kiểm tra logic thử lại khi lỗi

**Mã test:**
```python
def test_generate_text_retry_then_success(monkeypatch):
    # 1. Thiết lập
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    cfg = Config(load_env=False)
    client = DeepseekAPIClient(cfg, max_retries=2)
    
    # 2. Đếm số lần gọi
    calls = {"n": 0}
    
    # 3. Giả lập: lần 1 lỗi, lần 2 thành công
    def flaky_post(url, json=None, timeout=30):
        if calls["n"] == 0:
            calls["n"] += 1
            raise Timeout("timeout")  # Lỗi timeout
        return DummyResponse(200, {
            "choices": [{"message": {"content": "after-retry"}}]
        })
    
    # 4. Thay thế phương thức
    monkeypatch.setattr(client.session, "post", flaky_post)
    
    # 5. Gọi hàm
    out = client.generate_text("hi")
    
    # 6. Kiểm tra kết quả
    assert out == "after-retry"
```

**Quy trình:**
1. Tạo client với max_retries=2
2. Giả lập: lần 1 timeout, lần 2 thành công
3. Gọi `generate_text()`
4. Kiểm tra hệ thống thử lại và trả về kết quả

**Kết quả:** ✅ PASS

**Ý nghĩa:** Đảm bảo hệ thống có thể xử lý lỗi tạm thời

---

## [object Object] Analyzer Tests (2 tests)

### File: `tests/test_code_analyzer.py`

#### Test 2.1: `test_parse_functions_and_classes`

**Mục đích:** Kiểm tra phân tích hàm và lớp

**Mã test:**
```python
def test_parse_functions_and_classes():
    # 1. Mã nguồn cần phân tích
    source = """
class Greeter:
    def hello(self, name):
        '''Say hello'''
        return f"Hello, {name}"

def add(a, b):
    return a + b
"""
    
    # 2. Phân tích hàm
    funcs = parse_functions(source)
    
    # 3. Phân tích lớp
    classes = parse_classes(source)
    
    # 4. Kiểm tra kết quả
    assert any(f.name == "add" for f in funcs)
    assert any(c.name == "Greeter" for c in classes)
```

**Quy trình:**
1. Chuẩn bị mã nguồn có hàm và lớp
2. Gọi `parse_functions()` để tìm hàm
3. Gọi `parse_classes()` để tìm lớp
4. Kiểm tra tìm được hàm "add" và lớp "Greeter"

**Kết quả:** ✅ PASS

---

#### Test 2.2: `test_summarize_source_outputs_lines`

**Mục đích:** Kiểm tra tạo tóm tắt mã

**Mã test:**
```python
def test_summarize_source_outputs_lines():
    # 1. Mã nguồn
    source = """
class A:
    def m(self):
        pass

def f(x):
    return x
"""
    
    # 2. Tạo tóm tắt
    summary = summarize_source(source)
    
    # 3. Kiểm tra tóm tắt chứa các phần
    assert "Functions:" in summary or "Classes:" in summary
```

**Quy trình:**
1. Chuẩn bị mã nguồn
2. Gọi `summarize_source()` để tạo tóm tắt
3. Kiểm tra tóm tắt chứa "Functions:" hoặc "Classes:"

**Kết quả:** ✅ PASS

**Ý nghĩa:** Đảm bảo tóm tắt mã được tạo đúng

---

## 🧪 Test 3: Config Tests (2 tests)

### File: `tests/test_config.py`

#### Test 3.1: `test_config_requires_api_key`

**Mục đích:** Kiểm tra yêu cầu API key

**Mã test:**
```python
def test_config_requires_api_key():
    # 1. Cố gắng tạo config mà không có API key
    try:
        config = Config(load_env=False, validate=True)
        assert False, "Phải ném lỗi"
    except ValueError as e:
        # 2. Kiểm tra lỗi đúng
        assert "DEEPSEEK_API_KEY" in str(e)
```

**Quy trình:**
1. Tạo Config mà không có API key
2. Kiểm tra ném lỗi ValueError
3. Kiểm tra thông báo lỗi chứa "DEEPSEEK_API_KEY"

**Kết quả:** ✅ PASS

**Ý nghĩa:** Đảm bảo hệ thống bắt buộc API key

---

#### Test 3.2: `test_config_loads_with_api_key`

**Mục đích:** Kiểm tra tải config với API key

**Mã test:**
```python
def test_config_loads_with_api_key(monkeypatch):
    # 1. Thiết lập API key
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key-123")
    
    # 2. Tạo config
    config = Config(load_env=False, validate=True)
    
    # 3. Kiểm tra config được tạo
    assert config.deepseek_api_key == "test-key-123"
    assert config.max_tokens > 0
    assert 0 <= config.temperature <= 2
    assert 0 <= config.top_p <= 1
```

**Quy trình:**
1. Thiết lập API key
2. Tạo Config
3. Kiểm tra tất cả tham số được tải đúng

**Kết quả:** ✅ PASS

---

## 🧪 Test 4: Prompt Engineer Test (1 test)

### File: `tests/test_prompt_engineer.py`

#### Test 4.1: `test_build_prompt_contains_sections`

**Mục đích:** Kiểm tra xây dựng prompt

**Mã test:**
```python
def test_build_prompt_contains_sections():
    # 1. Mã cần test
    code = "def add(a, b): return a + b"
    
    # 2. Xây dựng prompt
    prompt = build_test_generation_prompt(
        code=code,
        specs="Test addition",
        framework="pytest"
    )
    
    # 3. Kiểm tra prompt chứa các phần
    assert "System:" in prompt
    assert "pytest" in prompt
    assert code in prompt
    assert "Specifications:" in prompt
    assert "Output ONLY" in prompt
```

**Quy trình:**
1. Chuẩn bị mã và yêu cầu
2. Xây dựng prompt
3. Kiểm tra prompt chứa tất cả phần cần thiết

**Kết quả:** ✅ PASS

**Ý nghĩa:** Đảm bảo prompt được xây dựng đầy đủ

---

## 🧪 Test 5: Test Generator Tests (2 tests)

### File: `tests/test_test_generator.py`

#### Test 5.1: `test_generate_tests_extracts_code_block`

**Mục đích:** Kiểm tra trích xuất code từ kết quả

**Mã test:**
```python
def test_generate_tests_extracts_code_block(monkeypatch):
    # 1. Thiết lập
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    config = Config(load_env=False)
    
    # 2. Giả lập API trả về markdown
    def mock_generate(prompt):
        return """
Here's the test:
```python
def test_add():
    assert add(1, 2) == 3
```
"""
    
    # 3. Tạo generator
    generator = TestGenerator(config)
    monkeypatch.setattr(generator.client, "generate_text", mock_generate)
    
    # 4. Tạo test
    result = generator.generate_tests("def add(a, b): return a + b")
    
    # 5. Kiểm tra code được trích xuất
    assert "def test_add" in result
```

**Quy trình:**
1. Giả lập API trả về markdown
2. Gọi `generate_tests()`
3. Kiểm tra code được trích xuất từ markdown

**Kết quả:** ✅ PASS

---

#### Test 5.2: `test_generate_and_save`

**Mục đích:** Kiểm tra tạo test và lưu file

**Mã test:**
```python
def test_generate_and_save(monkeypatch, tmp_path):
    # 1. Thiết lập
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    config = Config(load_env=False)
    
    # 2. Giả lập API
    def mock_generate(prompt):
        return "def test_sample(): pass"
    
    # 3. Tạo generator
    generator = TestGenerator(config)
    monkeypatch.setattr(generator.client, "generate_text", mock_generate)
    
    # 4. Tạo test và lưu
    output_file = tmp_path / "test_output.py"
    generator.generate_and_save(
        code="def sample(): pass",
        output_path=str(output_file)
    )
    
    # 5. Kiểm tra file được tạo
    assert output_file.exists()
    assert "test_sample" in output_file.read_text()
```

**Quy trình:**
1. Giả lập API
2. Gọi `generate_and_save()`
3. Kiểm tra file được tạo
4. Kiểm tra nội dung file

**Kết quả:** ✅ PASS

---

## 🧪 Test 6: Utils Tests (4 tests)

### File: `tests/test_utils.py`

#### Test 6.1: `test_write_and_read_file`

**Mục đích:** Kiểm tra đọc/ghi file

**Mã test:**
```python
def test_write_and_read_file(tmp_path):
    # 1. Chuẩn bị
    test_file = tmp_path / "test.txt"
    content = "Hello, World!"
    
    # 2. Ghi file
    write_file(str(test_file), content)
    
    # 3. Đọc file
    read_content = read_file(str(test_file))
    
    # 4. Kiểm tra nội dung
    assert read_content == content
    
    # 5. Kiểm tra không ghi đè nếu tồn tại
    try:
        write_file(str(test_file), "new content", overwrite=False)
        assert False, "Phải ném lỗi"
    except FileExistsError:
        pass
```

**Quy trình:**
1. Ghi nội dung vào file
2. Đọc nội dung từ file
3. Kiểm tra nội dung giống nhau
4. Kiểm tra bảo vệ ghi đè

**Kết quả:** ✅ PASS

---

#### Test 6.2: `test_validate_python_code`

**Mục đích:** Kiểm tra xác thực code Python

**Mã test:**
```python
def test_validate_python_code():
    # 1. Code hợp lệ
    valid_code = "def add(a, b): return a + b"
    assert validate_python_code(valid_code) == True
    
    # 2. Code không hợp lệ
    invalid_code = "def add(a, b) return a + b"  # Thiếu :
    assert validate_python_code(invalid_code) == False
    
    # 3. Code phức tạp
    complex_code = """
class MyClass:
    def method(self):
        return 42
"""
    assert validate_python_code(complex_code) == True
```

**Quy trình:**
1. Kiểm tra code hợp lệ → True
2. Kiểm tra code không hợp lệ → False
3. Kiểm tra code phức tạp → True

**Kết quả:** ✅ PASS

---

#### Test 6.3: `test_extract_code_blocks`

**Mục đích:** Kiểm tra trích xuất code từ markdown

**Mã test:**
```python
def test_extract_code_blocks():
    # 1. Markdown có code block
    markdown = """
Here's the code:
```python
def hello():
    print("Hello")
```

And more text.
"""
    
    # 2. Trích xuất code
    blocks = extract_code_blocks(markdown, language="python")
    
    # 3. Kiểm tra kết quả
    assert len(blocks) == 1
    assert "def hello" in blocks[0]
    assert "print" in blocks[0]
```

**Quy trình:**
1. Chuẩn bị markdown có code block
2. Gọi `extract_code_blocks()`
3. Kiểm tra code được trích xuất đúng

**Kết quả:** ✅ PASS

---

#### Test 6.4: `test_sanitize_and_truncate`

**Mục đích:** Kiểm tra làm sạch tên file và cắt chuỗi

**Mã test:**
```python
def test_sanitize_and_truncate():
    # 1. Làm sạch tên file
    filename = "test<file>:name|invalid.py"
    clean = sanitize_filename(filename)
    assert "<" not in clean
    assert ">" not in clean
    assert ":" not in clean
    
    # 2. Cắt chuỗi dài
    long_text = "a" * 200
    truncated = truncate_string(long_text, max_length=100)
    assert len(truncated) <= 100
    assert truncated.endswith("...")
    
    # 3. Chuỗi ngắn không cắt
    short_text = "hello"
    result = truncate_string(short_text, max_length=100)
    assert result == short_text
```

**Quy trình:**
1. Làm sạch tên file → loại bỏ ký tự không hợp lệ
2. Cắt chuỗi dài → thêm "..."
3. Chuỗi ngắn → không thay đổi

**Kết quả:** ✅ PASS

---

## 📊 Tóm Tắt Kết Quả

### Bảng Tóm Tắt

| Test | File | Trạng Thái | Mục Đích |
|------|------|-----------|---------|
| 1.1 | test_api_client.py | ✅ | Gọi API thành công |
| 1.2 | test_api_client.py | ✅ | Retry logic |
| 2.1 | test_code_analyzer.py | ✅ | Phân tích hàm/lớp |
| 2.2 | test_code_analyzer.py | ✅ | Tóm tắt mã |
| 3.1 | test_config.py | ✅ | Yêu cầu API key |
| 3.2 | test_config.py | ✅ | Tải config |
| 4.1 | test_prompt_engineer.py | ✅ | Xây dựng prompt |
| 5.1 | test_test_generator.py | ✅ | Trích xuất code |
| 5.2 | test_test_generator.py | ✅ | Lưu file |
| 6.1 | test_utils.py | ✅ | Đọc/ghi file |
| 6.2 | test_utils.py | ✅ | Xác thực code |
| 6.3 | test_utils.py | ✅ | Trích xuất markdown |
| 6.4 | test_utils.py | ✅ | Làm sạch/cắt chuỗi |

### Kết Quả Chung
```
✅ Tổng: 13 test
✅ PASS: 13 test
❌ FAIL: 0 test
⏭️ SKIP: 0 test
⚠️ Cảnh báo: 1 (không nghiêm trọng)

Thời gian: 1.48 giây
```

---

*Chi Tiết Các Test - 2025-11-27*

