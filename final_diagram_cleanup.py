#!/usr/bin/env python3
"""
Final Diagram Cleanup - Perfect Eye-Catching Styling
===================================================

This script performs final cleanup of all Mermaid diagrams, ensuring:
- No duplicate configurations
- Clean, eye-catching styling
- Proper node classifications
- Latest Mermaid v11.12.2+ compatibility
"""

import os
import re
import glob
from typing import List, Dict, Tuple

def get_perfect_themes() -> Dict[str, Dict]:
    """Define perfect eye-catching themes"""
    return {
        'architecture': {
            'name': 'Tech Blue',
            'config': '''%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#c9d1d9",
    "primaryBorderColor": "#1f6feb",
    "lineColor": "#1f6feb",
    "secondaryColor": "#388bfd",
    "tertiaryColor": "#79c0ff",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%''',
            'styling': '''
    %% --- TECH BLUE THEME STYLING ---
    classDef mobile fill:#0d1117,stroke:#1f6feb,stroke-width:3px,color:#c9d1d9,font-weight:bold;
    classDef service fill:#0d1117,stroke:#388bfd,stroke-width:2px,color:#c9d1d9,font-weight:normal;
    classDef database fill:#0d1117,stroke:#79c0ff,stroke-width:4px,color:#79c0ff,font-weight:bold;
    classDef external fill:#0d1117,stroke:#3fb950,stroke-width:2px,color:#3fb950,font-weight:normal,stroke-dasharray: 3 3;
    classDef gateway fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef process fill:#21262d,stroke:#1f6feb,stroke-width:2px,color:#c9d1d9,font-weight:normal;'''
        },
        'business': {
            'name': 'Corporate Green',
            'config': '''%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#aff5b4",
    "primaryBorderColor": "#238636",
    "lineColor": "#238636",
    "secondaryColor": "#2ea043",
    "tertiaryColor": "#3fb950",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%''',
            'styling': '''
    %% --- CORPORATE GREEN THEME STYLING ---
    classDef primary fill:#0d1117,stroke:#238636,stroke-width:4px,color:#aff5b4,font-weight:bold;
    classDef secondary fill:#0d1117,stroke:#2ea043,stroke-width:3px,color:#aff5b4,font-weight:normal;
    classDef process fill:#21262d,stroke:#238636,stroke-width:2px,color:#aff5b4,font-weight:normal;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef success fill:#0d1117,stroke:#238636,stroke-width:3px,color:#238636,font-weight:bold;
    classDef external fill:#0d1117,stroke:#2ea043,stroke-width:2px,color:#2ea043,font-weight:normal,stroke-dasharray: 3 3;
    classDef database fill:#0d1117,stroke:#3fb950,stroke-width:4px,color:#3fb950,font-weight:bold;'''
        },
        'payment': {
            'name': 'Financial Gold',
            'config': '''%%{init: {
  "theme": "dark",
  "themeVariables": {
    "primaryColor": "#0d1117",
    "primaryTextColor": "#f7d794",
    "primaryBorderColor": "#d97706",
    "lineColor": "#d97706",
    "secondaryColor": "#f59e0b",
    "tertiaryColor": "#fbbf24",
    "background": "#0d1117",
    "mainBkg": "#0d1117",
    "secondBkg": "#21262d"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%''',
            'styling': '''
    %% --- FINANCIAL GOLD THEME STYLING ---
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;'''
        }
    }

def completely_clean_diagram(content: str) -> str:
    """Completely clean diagram content"""
    
    # Remove ALL old configurations and styling
    content = re.sub(r'%%\{init:.*?\}%%', '', content, flags=re.DOTALL)
    content = re.sub(r'%%.*?---.*?%%', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'classDef.*?;', '', content, flags=re.MULTILINE)
    content = re.sub(r'class\s+.*?;', '', content, flags=re.MULTILINE)
    
    # Remove styling comments and sections
    content = re.sub(r'%%.*?STYLING.*?%%', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'%%.*?Styling.*?%%', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'%%.*?THEME.*?%%', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Clean up whitespace
    content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)
    content = content.strip()
    
    return content

def classify_nodes_intelligently(diagram_content: str, theme_name: str) -> str:
    """Intelligently classify nodes and return class assignments"""
    
    # Find all node definitions
    node_pattern = r'([A-Z]+)\[.*?\]'
    nodes = re.findall(node_pattern, diagram_content)
    
    if not nodes:
        return ""
    
    # Classify nodes based on content
    classifications = {}
    
    for node in nodes:
        # Find the node's label
        label_pattern = rf'{node}\[.*?"([^"]*)".*?\]'
        label_match = re.search(label_pattern, diagram_content)
        
        if label_match:
            label = label_match.group(1).lower()
            
            # Classify based on label content and theme
            if any(keyword in label for keyword in ['database', 'postgresql', 'redis', 'mongodb']):
                classifications[node] = 'database'
            elif any(keyword in label for keyword in ['payment', 'billing', 'transaction', 'revenue', 'commission']):
                if theme_name == 'Financial Gold':
                    classifications[node] = 'payment'
                else:
                    classifications[node] = 'primary'
            elif any(keyword in label for keyword in ['gateway', 'load balancer', 'api gateway']):
                classifications[node] = 'gateway'
            elif any(keyword in label for keyword in ['mobile', 'app', 'client', 'dashboard']):
                if theme_name == 'Tech Blue':
                    classifications[node] = 'mobile'
                else:
                    classifications[node] = 'primary'
            elif any(keyword in label for keyword in ['service', 'backend', 'auth', 'user']):
                if theme_name == 'Tech Blue':
                    classifications[node] = 'service'
                else:
                    classifications[node] = 'secondary'
            elif any(keyword in label for keyword in ['ebs', 'cyberpay', 'external']):
                classifications[node] = 'external' if theme_name == 'Tech Blue' else 'gateway'
            elif '?' in label or 'decision' in label:
                classifications[node] = 'decision'
            else:
                classifications[node] = 'process'
    
    # Generate class assignments
    if not classifications:
        return ""
    
    result = "\n    %% Node Classifications\n"
    
    # Group by class
    class_groups = {}
    for node, class_name in classifications.items():
        if class_name not in class_groups:
            class_groups[class_name] = []
        class_groups[class_name].append(node)
    
    # Add class assignments
    for class_name, nodes in class_groups.items():
        result += f"    class {','.join(nodes)} {class_name};\n"
    
    return result

def detect_diagram_type(content: str) -> str:
    """Detect the type of diagram based on content"""
    content_lower = content.lower()
    
    # Payment-related keywords
    if any(keyword in content_lower for keyword in ['payment', 'transaction', 'billing', 'revenue', 'commission', 'earnings']):
        return 'payment'
    
    # Business process keywords
    elif any(keyword in content_lower for keyword in ['trip', 'booking', 'passenger', 'driver', 'journey', 'process']):
        return 'business'
    
    # Architecture keywords (default)
    else:
        return 'architecture'

def process_file(file_path: str) -> bool:
    """Process a single file with perfect cleanup"""
    
    print(f"Final cleanup: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract all Mermaid diagrams
        pattern = r'```mermaid\n(.*?)\n```'
        diagrams = list(re.finditer(pattern, content, re.DOTALL))
        
        if not diagrams:
            print(f"  No Mermaid diagrams found")
            return False
        
        print(f"  Found {len(diagrams)} diagrams to perfect")
        
        # Get themes
        themes = get_perfect_themes()
        
        # Process diagrams in reverse order to maintain positions
        modified = False
        for i, match in enumerate(reversed(diagrams)):
            diagram_num = len(diagrams) - i
            start_pos = match.start()
            end_pos = match.end()
            diagram_content = match.group(1)
            
            # Detect diagram type and select theme
            diagram_type = detect_diagram_type(diagram_content)
            theme = themes[diagram_type]
            
            print(f"    Diagram {diagram_num}: Perfecting with {theme['name']} theme")
            
            # Completely clean the diagram content
            cleaned_content = completely_clean_diagram(diagram_content)
            
            # Build the perfect diagram
            perfect_diagram = theme['config'] + '\n' + cleaned_content + theme['styling']
            
            # Add intelligent node classification
            node_classifications = classify_nodes_intelligently(cleaned_content, theme['name'])
            perfect_diagram += node_classifications
            
            # Replace in content
            new_block = f"```mermaid\n{perfect_diagram}\n```"
            content = content[:start_pos] + new_block + content[end_pos:]
            modified = True
        
        if modified:
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ Perfected {file_path}")
            return True
        else:
            print(f"  No changes needed")
            return False
            
    except Exception as e:
        print(f"  ❌ Error processing {file_path}: {e}")
        return False

def main():
    """Main function to perfect all diagrams"""
    
    print("🎨 Final Diagram Cleanup - Perfect Eye-Catching Styling")
    print("=" * 65)
    
    # Find all markdown files
    md_files = []
    for pattern in ['*.md', 'docs/*.md', 'docs/**/*.md']:
        md_files.extend(glob.glob(pattern, recursive=True))
    
    # Remove duplicates and sort
    md_files = sorted(list(set(md_files)))
    
    print(f"Found {len(md_files)} markdown files to perfect")
    print("\n" + "=" * 65)
    
    # Process each file
    processed_count = 0
    perfected_count = 0
    
    for file_path in md_files:
        processed_count += 1
        if process_file(file_path):
            perfected_count += 1
    
    print("\n" + "=" * 65)
    print(f"🎉 Perfect Cleanup Complete!")
    print(f"Files processed: {processed_count}")
    print(f"Files perfected: {perfected_count}")
    
    if perfected_count > 0:
        print("\n🎨 Perfect Themes Applied:")
        themes = get_perfect_themes()
        for theme_key, theme_data in themes.items():
            print(f"  • {theme_data['name']} - {theme_key.title()} diagrams")
        
        print("\n✨ Perfect Features:")
        print("  • Completely clean configurations")
        print("  • No duplicate styling definitions")
        print("  • Eye-catching color schemes")
        print("  • Intelligent node classification")
        print("  • Latest Mermaid v11.12.2+ compatibility")
        print("  • GitHub dark mode optimization")
        print("  • Professional visual hierarchy")

if __name__ == "__main__":
    main()

