import json
from requests.exceptions import Timeout
from src.config import Config
from src.api_client import DeepseekAPIClient


class DummyResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {"choices": [{"message": {"content": "OK"}}]}

    def raise_for_status(self):
        if not (200 <= self.status_code < 300):
            raise Exception(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


def test_generate_text_success(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    cfg = Config(load_env=False)
    client = DeepseekAPIClient(cfg)

    def fake_post(url, json=None, timeout=30):
        return DummyResponse(200, {"choices": [{"message": {"content": "hello"}}]})

    monkeypatch.setattr(client.session, "post", fake_post)
    out = client.generate_text("hi")
    assert out == "hello"


def test_generate_text_retry_then_success(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-key")
    cfg = Config(load_env=False)
    client = DeepseekAPIClient(cfg, max_retries=2)

    calls = {"n": 0}

    def flaky_post(url, json=None, timeout=30):
        if calls["n"] == 0:
            calls["n"] += 1
            raise Timeout("timeout")
        return DummyResponse(200, {"choices": [{"message": {"content": "after-retry"}}]})

    monkeypatch.setattr(client.session, "post", flaky_post)
    out = client.generate_text("hi")
    assert out == "after-retry"

