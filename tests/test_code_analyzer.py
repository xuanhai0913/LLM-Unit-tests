from src.code_analyzer import parse_functions, parse_classes, summarize_source


def test_parse_functions_and_classes():
    source = """
class Greeter:
    def hello(self, name):
        '''Say hello'''
        return f"Hello, {name}"

def add(a, b):
    return a + b
"""
    funcs = parse_functions(source)
    classes = parse_classes(source)

    assert any(f.name == "add" for f in funcs)
    assert any(c.name == "Greeter" for c in classes)


def test_summarize_source_outputs_lines():
    source = """
class A:
    def m(self):
        pass

def f(x):
    return x
"""
    summary = summarize_source(source)
    assert "Functions:" in summary or "Classes:" in summary

