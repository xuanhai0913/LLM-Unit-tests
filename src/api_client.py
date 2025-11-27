"""
Deepseek API client for communicating with the LLM service.

This module provides a wrapper around the Deepseek API for generating tests.
"""

import logging
import time
from typing import Optional, Dict, Any
import requests
from requests.exceptions import RequestException, Timeout

from src.config import Config

logger = logging.getLogger(__name__)


class DeepseekAPIClient:
    """Client for interacting with Deepseek API."""

    def __init__(self, config: Config, max_retries: int = 3):
        """
        Initialize the Deepseek API client.

        Args:
            config: Configuration object containing API credentials
            max_retries: Maximum number of retry attempts for failed requests
        """
        self.config = config
        self.max_retries = max_retries
        self.session = requests.Session()
        self._setup_headers()

    def _setup_headers(self) -> None:
        """Set up default headers for API requests."""
        self.session.headers.update({
            "Authorization": f"Bearer {self.config.deepseek_api_key}",
            "Content-Type": "application/json",
        })

    def generate_text(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """
        Generate text using the Deepseek API.

        Args:
            prompt: The input prompt for text generation
            max_tokens: Maximum tokens in response (uses config default if None)
            temperature: Sampling temperature (uses config default if None)

        Returns:
            Generated text from the API

        Raises:
            RequestException: If API request fails
        """
        max_tokens = max_tokens or self.config.max_tokens
        temperature = temperature or self.config.temperature

        payload = {
            "model": self.config.deepseek_model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": self.config.top_p,
        }

        return self._make_request(payload)

    def _make_request(self, payload: Dict[str, Any]) -> str:
        """
        Make a request to the Deepseek API with retry logic.

        Args:
            payload: Request payload

        Returns:
            Generated text response

        Raises:
            RequestException: If all retry attempts fail
        """
        url = f"{self.config.deepseek_api_url}/chat/completions"

        for attempt in range(self.max_retries):
            try:
                logger.debug(f"API request attempt {attempt + 1}/{self.max_retries}")

                response = self.session.post(
                    url,
                    json=payload,
                    timeout=30,
                )

                response.raise_for_status()
                result = response.json()

                # Extract text from response
                if "choices" in result and len(result["choices"]) > 0:
                    return result["choices"][0]["message"]["content"]

                raise ValueError("Unexpected API response format")

            except Timeout:
                logger.warning(f"Request timeout on attempt {attempt + 1}")
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise

            except RequestException as e:
                logger.error(f"API request failed: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise

        raise RequestException("Failed to get response after all retries")

    def close(self) -> None:
        """Close the session."""
        self.session.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()

