"""
LLM-Powered Unit Test Generation

An intelligent application that leverages Large Language Models (Deepseek)
to automatically generate comprehensive unit tests.
"""

__version__ = "0.1.0"
__author__ = "Development Team"

from src.config import Config
from src.api_client import DeepseekAPIClient

__all__ = ["Config", "DeepseekAPIClient"]

