# API Reference

This document summarizes the main modules and classes available in the project.

## Modules

- src.config
- src.api_client
- src.prompt_engineer
- src.code_analyzer
- src.test_generator
- src.utils
- src.cli

---

## src.config

Class: Config
- Loads and validates configuration from environment variables (.env)
- Properties: deepseek_api_url, deepseek_model, max_tokens, temperature, top_p, debug, log_level
- Methods: to_dict()

## src.api_client

Class: DeepseekAPIClient
- Methods:
  - generate_text(prompt, max_tokens=None, temperature=None) -> str
  - close()
- Usage:
  - Wraps HTTP requests to Deepseek chat completion endpoint with retries.

## src.prompt_engineer

Functions:
- build_test_generation_prompt(code: str, specs: Optional[str], framework: str = "pytest") -> str

## src.code_analyzer

Data classes:
- FunctionInfo(name, args, docstring)
- ClassInfo(name, methods, docstring)

Functions:
- parse_functions(source: str) -> List[FunctionInfo]
- parse_classes(source: str) -> List[ClassInfo]
- summarize_source(source: str) -> str

## src.test_generator

Class: TestGenerator
- Methods:
  - generate_tests(code: str, specs: Optional[str] = None, framework: str = "pytest") -> str
  - generate_and_save(code: str, output_path: str, specs: Optional[str] = None, framework: str = "pytest", overwrite: bool = False) -> str

## src.utils

Functions:
- setup_logging(log_level: str = "INFO") -> None
- read_file(file_path: str) -> str
- write_file(file_path: str, content: str, overwrite: bool = False) -> None
- validate_python_code(code: str) -> bool
- extract_code_blocks(text: str, language: str = "python") -> List[str]
- sanitize_filename(filename: str) -> str
- truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str

## src.cli

Entry point module for the CLI. Use:
```bash
python -m src.cli --input path/to/module.py --output tests/test_module_generated.py
```

