import os
import pytest
from src.config import Config


def test_config_requires_api_key(monkeypatch):
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    with pytest.raises(ValueError):
        Config(load_env=False)


def test_config_loads_with_api_key(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    cfg = Config(load_env=False)
    assert cfg.deepseek_api_key == "test-key"
    assert isinstance(cfg.max_tokens, int)
    assert 0 <= cfg.temperature <= 2

