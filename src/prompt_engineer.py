"""
Prompt engineering utilities for test generation.
"""
from typing import Optional

DEFAULT_SYSTEM_INSTRUCTIONS = (
    "You are an expert software engineer and test writer. "
    "Generate high-quality, minimal, and maintainable unit tests. "
    "Prefer pytest. Cover normal cases, edge cases, and error handling."
)


def build_test_generation_prompt(
    code: str,
    specs: Optional[str] = None,
    framework: str = "pytest",
) -> str:
    """
    Build a prompt for generating unit tests from code and optional specifications.

    Args:
        code: Source code under test
        specs: Optional textual requirements or behavior specs
        framework: Desired test framework (e.g., pytest, unittest)

    Returns:
        Prompt string for the LLM
    """
    header = f"System: {DEFAULT_SYSTEM_INSTRUCTIONS}\n\n"
    framework_hint = (
        f"Please write tests using {framework}. If fixtures are helpful, add small inline fixtures.\n"
    )

    spec_block = f"Specifications:\n{specs}\n\n" if specs else ""

    code_block = f"Code under test:\n```python\n{code}\n```\n\n"

    output_req = (
        "Output ONLY a Python test module. "
        "Do not include explanations. If you include Markdown, wrap code in a single ```python block."
    )

    return header + framework_hint + spec_block + code_block + output_req + "\n"

