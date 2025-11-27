# Installation Guide

Follow these steps to set up the project locally.

## Prerequisites
- Python 3.8+
- pip

## 1) Clone the repository
```bash
git clone <repository-url>
cd LLM-Unit-Tests
```

## 2) Create and activate a virtual environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
# source venv/bin/activate
```

## 3) Install dependencies
```bash
pip install -r requirements.txt
```

## 4) Configure environment variables
Create a `.env` file in the project root:
```
DEEPSEEK_API_KEY=your_api_key_here
# Optional overrides
# DEEPSEEK_API_URL=https://api.deepseek.com/v1
# DEEPSEEK_MODEL=deepseek-coder
# MAX_TOKENS=2048
# TEMPERATURE=0.7
# TOP_P=0.95
```

## 5) Verify the setup
```bash
python -c "from src.config import Config; print(Config().to_dict())"
```

If you see a dictionary printed without errors, you're ready to go.

