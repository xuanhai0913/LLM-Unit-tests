# LLM-Powered Unit Test Generation

An intelligent application that leverages Large Language Models (Deepseek) to automatically generate comprehensive unit tests based on provided code, specifications, and test cases.

## Overview

This project aims to revolutionize unit test generation by harnessing the power of LLMs. Instead of manually writing tests, developers can provide code snippets and specifications, and the system will automatically generate meaningful, comprehensive unit tests.

### Key Features
- **Automated Test Generation**: Generate unit tests from code snippets
- **LLM-Powered**: Uses Deepseek API for intelligent test creation
- **Multiple Framework Support**: Support for pytest, unittest, and more
- **Customizable**: Configurable prompts and output formats
- **CLI Interface**: Easy-to-use command-line interface
- **Well-Documented**: Comprehensive documentation and examples

## 📋 Prerequisites

- Python 3.8 or higher
- Deepseek API key (get one at https://platform.deepseek.com)
- pip (Python package manager)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd LLM-Unit-tests
```

### 2. Set Up Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure API Key
Create a `.env` file in the project root:
```
DEEPSEEK_API_KEY=your_api_key_here
```

### 5. Verify Setup
```bash
python -c "from src.config import Config; print('Setup successful!')"
```

## 📚 Documentation

- **[USAGE.md](docs/USAGE.md)** - How to use the application
- **[API.md](docs/API.md)** - API reference documentation
- **[INSTALLATION.md](docs/INSTALLATION.md)** - Detailed installation guide
- **[Plan.md](Plan.md)** - Project roadmap and architecture
- **[Checklist.md](Checklist.md)** - Task tracking and progress

## Project Structure

```
LLM-Unit-Tests/
├── src/                    # Source code
│   ├── config.py          # Configuration management
│   ├── api_client.py      # Deepseek API integration
│   ├── test_generator.py  # Test generation logic
│   ├── prompt_engineer.py # Prompt templates
│   ├── code_analyzer.py   # Code analysis
│   └── utils.py           # Utilities
├── tests/                 # Unit tests
├── docs/                  # Documentation
├── examples/              # Example files
├── .env                   # API configuration (not in git)
├── requirements.txt       # Dependencies
└── README.md             # This file
```

## 🔧 Development

### Running Tests
```bash
pytest tests/ -v
```

### Code Quality
```bash
# Format code
black src/ tests/

# Lint code
flake8 src/ tests/

# Type checking
mypy src/
```

## 📖 Usage Example

```python
from src.test_generator import TestGenerator
from src.config import Config

# Initialize
config = Config()
generator = TestGenerator(config)

# Generate tests
code = """
def add(a, b):
    return a + b
"""

tests = generator.generate_tests(code)
print(tests)
```

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🔗 References

- **Research Paper**: https://dl.acm.org/doi/pdf/10.1145/3663529.3663839
- **Video Tutorial**: https://www.youtube.com/watch?v=VtJKQHoyb2A
- **Deepseek API**: https://platform.deepseek.com

---

