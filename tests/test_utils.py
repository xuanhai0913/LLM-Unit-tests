import os
from src.utils import write_file, read_file, validate_python_code, extract_code_blocks, sanitize_filename, truncate_string


def test_write_and_read_file(tmp_path):
    path = tmp_path / "example.txt"
    write_file(str(path), "hello")
    assert os.path.exists(path)
    assert read_file(str(path)) == "hello"


def test_validate_python_code():
    assert validate_python_code("x = 1\n") is True
    assert validate_python_code("def f(:\n    pass\n") is False


def test_extract_code_blocks():
    text = """
Here is code:
```python
print('hi')
```
And more.
```python
x=1
```
"""
    blocks = extract_code_blocks(text)
    assert len(blocks) == 2
    assert "print('hi')" in blocks[0]


def test_sanitize_and_truncate():
    assert sanitize_filename('a:b/c') == 'a_b_c'
    assert truncate_string('abcdef', 4) == 'a...'

