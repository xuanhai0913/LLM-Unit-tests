"""
Core test generation engine using Deepseek LLM.
"""
from typing import Optional

from src.config import Config
from src.api_client import DeepseekAPIClient
from src.prompt_engineer import build_test_generation_prompt
from src.utils import extract_code_blocks, validate_python_code, write_file


class TestGenerator:
    """Generate unit tests for given source code using an LLM."""

    def __init__(self, config: Config, client: Optional[DeepseekAPIClient] = None):
        self.config = config
        self.client = client or DeepseekAPIClient(config)

    def generate_tests(
        self,
        code: str,
        specs: Optional[str] = None,
        framework: str = "pytest",
    ) -> str:
        """
        Generate unit tests for the provided source code.

        Args:
            code: Source code to test
            specs: Optional specifications or behavior
            framework: Test framework to use

        Returns:
            Python test module content as string
        """
        prompt = build_test_generation_prompt(code=code, specs=specs, framework=framework)
        raw = self.client.generate_text(prompt)

        # Prefer python code block if present
        blocks = extract_code_blocks(raw, language="python")
        test_code = blocks[0] if blocks else raw

        # Validate and fallback to simple wrapper if invalid
        if not validate_python_code(test_code):
            test_code = f"# Generated tests (raw)\n{test_code}"

        return test_code

    def generate_and_save(
        self,
        code: str,
        output_path: str,
        specs: Optional[str] = None,
        framework: str = "pytest",
        overwrite: bool = False,
    ) -> str:
        """
        Generate tests and save to a file.

        Returns the saved path.
        """
        tests = self.generate_tests(code=code, specs=specs, framework=framework)
        write_file(output_path, tests, overwrite=overwrite)
        return output_path

