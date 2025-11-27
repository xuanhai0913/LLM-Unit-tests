"""
Utility functions for the LLM Unit Test Generator.

This module provides helper functions for file I/O, text processing, and validation.
"""

import os
import logging
from typing import List, Optional


def setup_logging(log_level: str = "INFO") -> None:
    """
    Set up logging configuration.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def read_file(file_path: str) -> str:
    """
    Read contents of a file.

    Args:
        file_path: Path to the file

    Returns:
        File contents as string

    Raises:
        FileNotFoundError: If file does not exist
        IOError: If file cannot be read
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except IOError as e:
        raise IOError(f"Error reading file {file_path}: {e}")


def write_file(file_path: str, content: str, overwrite: bool = False) -> None:
    """
    Write content to a file.

    Args:
        file_path: Path to the file
        content: Content to write
        overwrite: Whether to overwrite existing file

    Raises:
        FileExistsError: If file exists and overwrite is False
        IOError: If file cannot be written
    """
    if os.path.exists(file_path) and not overwrite:
        raise FileExistsError(f"File already exists: {file_path}")

    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
    except IOError as e:
        raise IOError(f"Error writing to file {file_path}: {e}")


def validate_python_code(code: str) -> bool:
    """
    Validate that a string is valid Python code.

    Args:
        code: Python code to validate

    Returns:
        True if code is valid, False otherwise
    """
    try:
        compile(code, "<string>", "exec")
        return True
    except SyntaxError:
        return False


def extract_code_blocks(text: str, language: str = "python") -> List[str]:
    """
    Extract code blocks from markdown text.

    Args:
        text: Text containing code blocks
        language: Programming language to extract (default: python)

    Returns:
        List of code blocks
    """
    blocks = []
    lines = text.split("\n")
    in_block = False
    current_block = []

    for line in lines:
        if line.startswith(f"```{language}"):
            in_block = True
            current_block = []
        elif line.startswith("```") and in_block:
            in_block = False
            if current_block:
                blocks.append("\n".join(current_block))
        elif in_block:
            current_block.append(line)

    return blocks


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to remove invalid characters.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, "_")
    return filename


def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Truncate a string to a maximum length.

    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add if truncated

    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix
