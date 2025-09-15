import os
import ast
from pygments import lex
from pygments.lexers import get_lexer_by_name
from pygments.token import Token, Name

def parse_python_file(file_path):
    """
    Parses a Python file using the built-in AST module.
    """
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        code = file.read()
    
    tree = ast.parse(code)
    constructs = []
    
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            constructs.append({
                'name': node.name,
                'type': 'function',
                'line': node.lineno,
                'code_snippet': ast.get_source_segment(code, node) # ✅ ADDED: Get the full source of the function
            })
        elif isinstance(node, ast.ClassDef):
            constructs.append({
                'name': node.name,
                'type': 'class',
                'line': node.lineno,
                'code_snippet': ast.get_source_segment(code, node) # ✅ ADDED: Get the full source of the class
            })
            
    return constructs

def parse_javascript_file(file_path):
    """
    Parses a JavaScript file using the Pygments lexer with improved logic.
    NOTE: Reliably extracting full function bodies with a lexer is very complex.
    This feature is currently focused on Python.
    """
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        code = file.read()

    lexer = get_lexer_by_name("javascript")
    tokens = list(lex(code, lexer))
    
    constructs = []
    for i, token in enumerate(tokens):
        token_type, token_value = token
        
        # Detects: `function MyComponent()` or `class MyClass`
        if token_type in Token.Keyword and token_value in ['function', 'class']:
            for j in range(i + 1, len(tokens)):
                next_token_type, next_token_value = tokens[j]
                if next_token_type in Name:
                    constructs.append({
                        'name': next_token_value,
                        'type': 'function' if token_value == 'function' else 'class',
                        'line': -1,
                        'code_snippet': None # ✅ ADDED: Snippet not available for JS with this method
                    })
                    break
        
        # Detects: `const MyComponent = () => ...`
        if token_type is Token.Keyword.Declaration and token_value in ['const', 'let']:
            if i + 3 < len(tokens):
                name_token = tokens[i+2]
                equals_token = tokens[i+4]
                if name_token[0] in Name and equals_token[1] == '=':
                    constructs.append({
                        'name': name_token[1],
                        'type': 'function',
                        'line': -1,
                        'code_snippet': None # ✅ ADDED: Snippet not available for JS with this method
                    })

    unique_constructs = [dict(t) for t in {tuple(d.items()) for d in constructs}]
    return unique_constructs

def parse_code_file(file_path):
    """
    Main parser function that routes to the correct language-specific parser.
    """
    all_items = []
    language = "unknown"
    
    try:
        if file_path.endswith('.py'):
            all_items = parse_python_file(file_path)
            language = "python"
        elif file_path.endswith(('.js', '.jsx')):
            all_items = parse_javascript_file(file_path)
            language = "javascript"
        else:
            return None

        if not all_items:
            return None

        return {
            "file_path": os.path.basename(file_path),
            "language": language,
            "constructs": all_items
        }
    except Exception as e:
        print(f"Could not parse file {file_path}: {e}")
        return None