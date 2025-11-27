"""
Configuration management for the LLM Unit Test Generator.

This module handles loading and validating configuration from environment variables.
"""

import os
from typing import Optional
from dotenv import load_dotenv


class Config:
    """Configuration class for managing application settings."""

    def __init__(self, env_file: str = ".env", load_env: bool = True):
        """
        Initialize configuration from environment variables.

        Args:
            env_file: Path to the .env file (default: ".env")
            load_env: Whether to load variables from the .env file

        Raises:
            ValueError: If required configuration is missing
        """
        # Load environment variables from .env file (optional)
        if load_env:
            load_dotenv(env_file)

        # API Configuration
        self.deepseek_api_key: Optional[str] = os.getenv("DEEPSEEK_API_KEY")
        self.deepseek_api_url: str = os.getenv(
            "DEEPSEEK_API_URL",
            "https://api.deepseek.com/v1"
        )
        self.deepseek_model: str = os.getenv(
            "DEEPSEEK_MODEL",
            "deepseek-coder"
        )

        # Test Generation Configuration
        self.max_tokens: int = int(os.getenv("MAX_TOKENS", "2048"))
        self.temperature: float = float(os.getenv("TEMPERATURE", "0.7"))
        self.top_p: float = float(os.getenv("TOP_P", "0.95"))

        # Application Configuration
        self.debug: bool = os.getenv("DEBUG", "false").lower() == "true"
        self.log_level: str = os.getenv("LOG_LEVEL", "INFO")

        # Validate required configuration
        self._validate()

    def _validate(self) -> None:
        """
        Validate that all required configuration is present.

        Raises:
            ValueError: If required configuration is missing
        """
        if not self.deepseek_api_key:
            raise ValueError(
                "DEEPSEEK_API_KEY environment variable is required. "
                "Please set it in your .env file."
            )

        if not self.deepseek_api_url:
            raise ValueError("DEEPSEEK_API_URL is required")

        if self.max_tokens < 1:
            raise ValueError("MAX_TOKENS must be greater than 0")

        if not (0 <= self.temperature <= 2):
            raise ValueError("TEMPERATURE must be between 0 and 2")

        if not (0 <= self.top_p <= 1):
            raise ValueError("TOP_P must be between 0 and 1")

    def to_dict(self) -> dict:
        """
        Convert configuration to dictionary.

        Returns:
            Dictionary containing all configuration values
        """
        return {
            "deepseek_api_url": self.deepseek_api_url,
            "deepseek_model": self.deepseek_model,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "top_p": self.top_p,
            "debug": self.debug,
            "log_level": self.log_level,
        }

    def __repr__(self) -> str:
        """String representation of configuration."""
        return f"Config({self.to_dict()})"

