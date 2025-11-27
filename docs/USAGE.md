# Usage Guide

You can use the project via CLI or Python API.

## CLI

Generate tests from a Python source file:

```bash
python -m src.cli --input path/to/module.py --output tests/test_module_generated.py
```

With additional specs to guide generation:

```bash
python -m src.cli \
  --input path/to/module.py \
  --specs docs/specs.md \
  --framework pytest \
  --output tests/test_module_generated.py
```

Common options:
- --input: Path to Python source file (required)
- --specs: Optional path to text/markdown specs
- --framework: pytest or unittest (default: pytest)
- --output: Output path for generated tests
- --log-level: DEBUG, INFO, WARNING, ERROR

## Python API

```python
from src.config import Config
from src.test_generator import TestGenerator

config = Config()
gen = TestGenerator(config)

code = """
from math import sqrt

def hyp(a, b):
    return sqrt(a*a + b*b)
"""

specs = "Function hyp computes hypotenuse length"
content = gen.generate_tests(code, specs=specs)
print(content)

# Save to file
path = gen.generate_and_save(code, output_path="tests/test_hyp.py", specs=specs)
print("Saved:", path)
```

