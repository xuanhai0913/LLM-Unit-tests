"""
Command-line interface for the LLM Unit Test Generator.
"""
import argparse
import sys

from src.config import Config
from src.test_generator import TestGenerator
from src.utils import read_file, setup_logging


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate unit tests for a Python module using Deepseek LLM",
    )
    parser.add_argument("--input", required=True, help="Path to the Python source file")
    parser.add_argument(
        "--specs",
        required=False,
        help="Optional path to a specs/requirements file to guide test generation",
    )
    parser.add_argument(
        "--output",
        required=False,
        default="tests/test_generated.py",
        help="Where to write the generated tests (default: tests/test_generated.py)",
    )
    parser.add_argument(
        "--framework",
        required=False,
        default="pytest",
        choices=["pytest", "unittest"],
        help="Test framework to use (default: pytest)",
    )
    parser.add_argument(
        "--log-level",
        required=False,
        default="INFO",
        help="Log level (DEBUG, INFO, WARNING, ERROR)",
    )

    args = parser.parse_args(argv)

    setup_logging(args.log_level)

    try:
        config = Config()
    except Exception as e:
        print(f"Configuration error: {e}")
        return 2

    code = read_file(args.input)
    specs_text = read_file(args.specs) if args.specs else None

    generator = TestGenerator(config)
    try:
        path = generator.generate_and_save(
            code=code,
            output_path=args.output,
            specs=specs_text,
            framework=args.framework,
            overwrite=True,
        )
        print(f"Generated tests written to: {path}")
        return 0
    except Exception as e:
        print(f"Generation failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

