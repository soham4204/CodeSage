import os
import ast
import re

def parse_python_file(file_path):
    """
    Parses a Python file using the built-in AST module.
    Now properly captures class-method relationships.
    """
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        code = file.read()
    
    tree = ast.parse(code)
    constructs = []
    
    # Process top-level nodes to maintain hierarchy
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            constructs.append({
                'name': node.name,
                'type': 'function',
                'line': node.lineno,
                'code_snippet': ast.get_source_segment(code, node),
                'parent_class': None  # Top-level function
            })
        elif isinstance(node, ast.ClassDef):
            # Add the class itself
            constructs.append({
                'name': node.name,
                'type': 'class',
                'line': node.lineno,
                'code_snippet': ast.get_source_segment(code, node),
                'methods': []  # We'll populate this
            })
            
            # Process methods inside the class
            methods = []
            for class_node in node.body:
                if isinstance(class_node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    method_info = {
                        'name': class_node.name,
                        'type': 'method',
                        'line': class_node.lineno,
                        'code_snippet': ast.get_source_segment(code, class_node),
                        'parent_class': node.name
                    }
                    constructs.append(method_info)
                    methods.append(method_info)
            
            # Update the class with its methods
            constructs[-len(methods)-1]['methods'] = methods
            
    return constructs

def parse_javascript_file(file_path):
    """
    Parses a JavaScript file using regex patterns to extract function bodies.
    Enhanced to capture class-method relationships.
    """
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        content = file.read()

    constructs = []
    
    # Pattern for class declarations with methods
    class_pattern = r'class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'
    
    for class_match in re.finditer(class_pattern, content, re.DOTALL):
        class_name = class_match.group(1)
        class_body = class_match.group(2)
        full_class = class_match.group(0)
        
        # Add the class
        class_info = {
            'name': class_name,
            'type': 'class',
            'line': content[:class_match.start()].count('\n') + 1,
            'code_snippet': full_class.strip(),
            'methods': []
        }
        
        # Find methods within the class body
        method_pattern = r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        methods = []
        
        for method_match in re.finditer(method_pattern, class_body):
            method_name = method_match.group(1)
            # Skip constructor and common keywords
            if method_name not in ['constructor', 'if', 'for', 'while', 'switch']:
                method_info = {
                    'name': method_name,
                    'type': 'method',
                    'line': content[:class_match.start() + method_match.start()].count('\n') + 1,
                    'code_snippet': method_match.group(0).strip(),
                    'parent_class': class_name
                }
                constructs.append(method_info)
                methods.append(method_info)
        
        class_info['methods'] = methods
        constructs.append(class_info)
    
    # Pattern 1: Regular function declarations (top-level)
    function_pattern = r'function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'
    for match in re.finditer(function_pattern, content, re.DOTALL):
        # Check if this function is inside a class (skip if so)
        if not any(class_match.start() < match.start() < class_match.end() 
                  for class_match in re.finditer(class_pattern, content, re.DOTALL)):
            function_name = match.group(1)
            function_body = match.group(0)
            constructs.append({
                'name': function_name,
                'type': 'function',
                'line': content[:match.start()].count('\n') + 1,
                'code_snippet': function_body.strip(),
                'parent_class': None
            })
    
    # Pattern 2: Arrow functions assigned to const/let/var (top-level)
    arrow_function_pattern = r'(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|[^;,\n]+)'
    for match in re.finditer(arrow_function_pattern, content, re.DOTALL):
        # Check if this function is inside a class (skip if so)
        if not any(class_match.start() < match.start() < class_match.end() 
                  for class_match in re.finditer(class_pattern, content, re.DOTALL)):
            function_name = match.group(2)
            function_body = match.group(0)
            constructs.append({
                'name': function_name,
                'type': 'function',
                'line': content[:match.start()].count('\n') + 1,
                'code_snippet': function_body.strip(),
                'parent_class': None
            })
    
    # Remove duplicates
    unique_constructs = []
    seen = set()
    for construct in constructs:
        key = (construct['name'], construct['type'], construct.get('parent_class'))
        if key not in seen:
            seen.add(key)
            unique_constructs.append(construct)
    
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