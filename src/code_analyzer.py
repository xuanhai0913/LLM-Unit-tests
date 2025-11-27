"""
Basic code analysis utilities to enrich prompts.
"""
import ast
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class FunctionInfo:
    name: str
    args: List[str]
    docstring: Optional[str]


@dataclass
class ClassInfo:
    name: str
    methods: List[FunctionInfo]
    docstring: Optional[str]


def parse_functions(source: str) -> List[FunctionInfo]:
    """
    Extract top-level functions from Python source.
    """
    tree = ast.parse(source)
    funcs: List[FunctionInfo] = []
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            args = [a.arg for a in node.args.args]
            doc = ast.get_docstring(node)
            funcs.append(FunctionInfo(name=node.name, args=args, docstring=doc))
    return funcs


def parse_classes(source: str) -> List[ClassInfo]:
    """
    Extract classes and their methods from Python source.
    """
    tree = ast.parse(source)
    classes: List[ClassInfo] = []
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            methods: List[FunctionInfo] = []
            for body_item in node.body:
                if isinstance(body_item, ast.FunctionDef):
                    args = [a.arg for a in body_item.args.args]
                    doc = ast.get_docstring(body_item)
                    methods.append(
                        FunctionInfo(name=body_item.name, args=args, docstring=doc)
                    )
            classes.append(
                ClassInfo(
                    name=node.name,
                    methods=methods,
                    docstring=ast.get_docstring(node),
                )
            )
    return classes


def summarize_source(source: str) -> str:
    """
    Create a brief summary of the given source code for prompt enrichment.
    """
    funcs = parse_functions(source)
    classes = parse_classes(source)

    lines: List[str] = []
    if funcs:
        lines.append("Functions:")
        for f in funcs:
            lines.append(f"- {f.name}({', '.join(f.args)})")
    if classes:
        lines.append("Classes:")
        for c in classes:
            lines.append(f"- {c.name} (methods: {', '.join(m.name for m in c.methods)})")

    return "\n".join(lines) if lines else "No public symbols detected."

