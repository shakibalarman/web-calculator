import ast
import operator as op
import math

# Supported operators
operators = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.Mod: op.mod,
    ast.Pow: op.pow,
    ast.USub: op.neg,
    ast.UAdd: op.pos,
}

# Supported mathematical functions
functions = {
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log10,  # default to log10 for calculator
    "ln": math.log,     # natural log
    "sqrt": math.sqrt,
    "pi": math.pi,
    "e": math.e
}

def safe_eval(expr: str):
    """
    Safely evaluate a mathematical expression from a string using AST.
    Raises ValueError on syntax or evaluation errors.
    """
    try:
        # Prevent huge exponents or other possible DoS vectors via ast parsing limits (if possible)
        # We can cap length of expression
        if len(expr) > 200:
            raise ValueError("Expression too long")
            
        tree = ast.parse(expr, mode='eval').body
        return _eval(tree)
    except Exception as e:
        raise ValueError(f"Invalid expression: {str(e)}")

def _eval(node):
    if isinstance(node, ast.Constant): # Python 3.8+ handles numbers as Constants
        if isinstance(node.value, (int, float)):
            return node.value
        raise TypeError("Unsupported constant type")
    elif isinstance(node, ast.Num): # Older python fallback
        return node.n
    elif isinstance(node, ast.BinOp):
        left = _eval(node.left)
        right = _eval(node.right)
        if isinstance(node.op, ast.Pow) and right > 1000:
            raise ValueError("Exponent too large")
        return operators[type(node.op)](left, right)
    elif isinstance(node, ast.UnaryOp):
        return operators[type(node.op)](_eval(node.operand))
    elif isinstance(node, ast.Name):
        if node.id in functions:
            return functions[node.id]
        raise ValueError(f"Unknown variable or function: {node.id}")
    elif isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name):
            func = _eval(node.func)
            if callable(func):
                args = [_eval(arg) for arg in node.args]
                return func(*args)
        raise ValueError("Unsupported function call")
    else:
        raise TypeError(f"Unsupported AST node type: {type(node).__name__}")
