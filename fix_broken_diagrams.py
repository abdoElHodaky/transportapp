#!/usr/bin/env python3
"""
Fix Broken Diagrams with Eye-Catching Styling
============================================

This script identifies and fixes broken Mermaid diagrams throughout the repository,
applying eye-catching styling with the latest v11.12.2+ syntax.

Common Issues Fixed:
- Duplicate %%{init: {...}}%% blocks
- Missing or incorrect theme configurations
- Broken syntax from old Mermaid versions
- Missing styling classes
- Inconsistent color schemes
"""

import os
import re
import glob
from typing import List, Dict, Tuple

def get_eye_catching_themes() -> Dict[str, Dict]:
    """Define eye-catching themes for different diagram types"""
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
    "secondBkg": "#21262d",
    "tertiaryBkg": "#30363d"
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
            'classes': '''
    %% --- TECH BLUE THEME STYLING ---
    
    %% Primary nodes (main components)
    classDef primary fill:#0d1117,stroke:#1f6feb,stroke-width:4px,color:#c9d1d9,font-weight:bold;
    
    %% Secondary nodes (supporting components)
    classDef secondary fill:#0d1117,stroke:#388bfd,stroke-width:3px,color:#c9d1d9,font-weight:normal;
    
    %% Database nodes (data storage)
    classDef database fill:#0d1117,stroke:#79c0ff,stroke-width:4px,color:#79c0ff,font-weight:bold;
    
    %% External nodes (third-party services)
    classDef external fill:#0d1117,stroke:#3fb950,stroke-width:2px,color:#3fb950,font-weight:normal,stroke-dasharray: 3 3;
    
    %% Gateway nodes (entry points)
    classDef gateway fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold;
    
    %% Process nodes (operations)
    classDef process fill:#21262d,stroke:#1f6feb,stroke-width:2px,color:#c9d1d9,font-weight:normal;
    
    %% Decision nodes (branching points)
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    
    %% Success nodes (positive outcomes)
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    
    %% Warning nodes (attention needed)
    classDef warning fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 5 5;
    
    %% Error nodes (problems/failures)
    classDef error fill:#0d1117,stroke:#da3633,stroke-width:3px,color:#da3633,font-weight:bold,stroke-dasharray: 10 5;'''
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
    "secondBkg": "#21262d",
    "tertiaryBkg": "#3fb950"
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
            'classes': '''
    %% --- CORPORATE GREEN THEME STYLING ---
    
    %% Primary nodes (main components)
    classDef primary fill:#0d1117,stroke:#238636,stroke-width:4px,color:#aff5b4,font-weight:bold;
    
    %% Secondary nodes (supporting components)
    classDef secondary fill:#0d1117,stroke:#2ea043,stroke-width:3px,color:#aff5b4,font-weight:normal;
    
    %% Accent nodes (highlights)
    classDef accent fill:#0d1117,stroke:#3fb950,stroke-width:2px,color:#3fb950,font-weight:bold;
    
    %% Success nodes (positive outcomes)
    classDef success fill:#0d1117,stroke:#238636,stroke-width:3px,color:#238636,font-weight:bold;
    
    %% Process nodes (operations)
    classDef process fill:#21262d,stroke:#238636,stroke-width:2px,color:#aff5b4,font-weight:normal;
    
    %% Decision nodes (branching points)
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    
    %% External nodes (third-party services)
    classDef external fill:#0d1117,stroke:#2ea043,stroke-width:2px,color:#2ea043,font-weight:normal,stroke-dasharray: 3 3;
    
    %% Warning nodes (attention needed)
    classDef warning fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 5 5;
    
    %% Error nodes (problems/failures)
    classDef error fill:#0d1117,stroke:#da3633,stroke-width:3px,color:#da3633,font-weight:bold,stroke-dasharray: 10 5;
    
    %% Database nodes (data storage)
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
    "secondBkg": "#21262d",
    "tertiaryBkg": "#fbbf24"
  },
  "sequence": {
    "useMaxWidth": true,
    "wrap": true
  }
}}%%''',
            'classes': '''
    %% --- FINANCIAL GOLD THEME STYLING ---
    
    %% Primary nodes (main components)
    classDef primary fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    
    %% Secondary nodes (supporting components)
    classDef secondary fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    
    %% Accent nodes (highlights)
    classDef accent fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:bold;
    
    %% Success nodes (positive outcomes)
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    
    %% Process nodes (operations)
    classDef process fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    
    %% Decision nodes (branching points)
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    
    %% External nodes (third-party services)
    classDef external fill:#0d1117,stroke:#f59e0b,stroke-width:2px,color:#f59e0b,font-weight:normal,stroke-dasharray: 3 3;
    
    %% Warning nodes (attention needed)
    classDef warning fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 5 5;
    
    %% Error nodes (problems/failures)
    classDef error fill:#0d1117,stroke:#da3633,stroke-width:3px,color:#da3633,font-weight:bold,stroke-dasharray: 10 5;
    
    %% Database nodes (data storage)
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;'''
        }
    }

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

def extract_mermaid_diagrams(content: str) -> List[Tuple[int, int, str]]:
    """Extract all Mermaid diagrams from content with their positions"""
    diagrams = []
    pattern = r'```mermaid\n(.*?)\n```'
    
    for match in re.finditer(pattern, content, re.DOTALL):
        start_pos = match.start()
        end_pos = match.end()
        diagram_content = match.group(1)
        diagrams.append((start_pos, end_pos, diagram_content))
    
    return diagrams

def fix_diagram_syntax(diagram_content: str, theme_config: Dict) -> str:
    """Fix common syntax issues and apply eye-catching styling"""
    
    # Remove duplicate %%{init: {...}}%% blocks
    init_pattern = r'%%\{init:.*?\}%%'
    diagram_content = re.sub(init_pattern, '', diagram_content, flags=re.DOTALL)
    
    # Clean up extra whitespace
    diagram_content = re.sub(r'\n\s*\n\s*\n', '\n\n', diagram_content)
    
    # Detect diagram type
    if 'sequenceDiagram' in diagram_content:
        diagram_type = 'sequence'
    elif 'graph' in diagram_content or 'flowchart' in diagram_content:
        diagram_type = 'flowchart'
    elif 'classDiagram' in diagram_content:
        diagram_type = 'class'
    elif 'erDiagram' in diagram_content:
        diagram_type = 'er'
    else:
        diagram_type = 'flowchart'
    
    # Build the fixed diagram
    fixed_diagram = theme_config['config'] + '\n'
    
    # Add the diagram content
    fixed_diagram += diagram_content.strip()
    
    # Add styling classes if it's a flowchart or sequence diagram
    if diagram_type in ['flowchart', 'sequence']:
        fixed_diagram += '\n' + theme_config['classes']
    
    return fixed_diagram

def classify_nodes_and_apply_styles(diagram_content: str) -> str:
    """Intelligently classify nodes and apply appropriate styles"""
    
    # Find all node definitions
    node_pattern = r'([A-Z]+)\[.*?\]'
    nodes = re.findall(node_pattern, diagram_content)
    
    if not nodes:
        return diagram_content
    
    # Classify nodes based on content
    classifications = {}
    
    for node in nodes:
        # Find the node's label
        label_pattern = rf'{node}\["([^"]*)".*?\]'
        label_match = re.search(label_pattern, diagram_content)
        
        if label_match:
            label = label_match.group(1).lower()
            
            # Classify based on label content
            if any(keyword in label for keyword in ['database', 'postgresql', 'redis', 'mongodb']):
                classifications[node] = 'database'
            elif any(keyword in label for keyword in ['api', 'gateway', 'service', 'backend']):
                classifications[node] = 'primary'
            elif any(keyword in label for keyword in ['app', 'mobile', 'web', 'client']):
                classifications[node] = 'secondary'
            elif any(keyword in label for keyword in ['payment', 'billing', 'transaction']):
                classifications[node] = 'accent'
            elif '?' in label or 'decision' in label:
                classifications[node] = 'decision'
            elif any(keyword in label for keyword in ['ebs', 'cyberpay', 'external']):
                classifications[node] = 'external'
            else:
                classifications[node] = 'process'
    
    # Apply classifications
    if classifications:
        diagram_content += '\n\n    %% Node Classifications\n'
        
        # Group by class
        class_groups = {}
        for node, class_name in classifications.items():
            if class_name not in class_groups:
                class_groups[class_name] = []
            class_groups[class_name].append(node)
        
        # Add class assignments
        for class_name, nodes in class_groups.items():
            diagram_content += f'    class {",".join(nodes)} {class_name};\n'
    
    return diagram_content

def process_file(file_path: str) -> bool:
    """Process a single file and fix all broken diagrams"""
    
    print(f"Processing: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract all Mermaid diagrams
        diagrams = extract_mermaid_diagrams(content)
        
        if not diagrams:
            print(f"  No Mermaid diagrams found")
            return False
        
        print(f"  Found {len(diagrams)} diagrams")
        
        # Get themes
        themes = get_eye_catching_themes()
        
        # Process diagrams in reverse order to maintain positions
        modified = False
        for start_pos, end_pos, diagram_content in reversed(diagrams):
            
            # Detect diagram type and select theme
            diagram_type = detect_diagram_type(diagram_content)
            theme = themes[diagram_type]
            
            print(f"    Applying {theme['name']} theme to diagram")
            
            # Fix the diagram
            fixed_diagram = fix_diagram_syntax(diagram_content, theme)
            
            # Apply intelligent node classification
            fixed_diagram = classify_nodes_and_apply_styles(fixed_diagram)
            
            # Replace in content
            new_block = f"```mermaid\n{fixed_diagram}\n```"
            content = content[:start_pos] + new_block + content[end_pos:]
            modified = True
        
        if modified:
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ Updated {file_path}")
            return True
        else:
            print(f"  No changes needed")
            return False
            
    except Exception as e:
        print(f"  ❌ Error processing {file_path}: {e}")
        return False

def main():
    """Main function to process all markdown files"""
    
    print("🔧 Fixing Broken Diagrams with Eye-Catching Styling")
    print("=" * 60)
    
    # Find all markdown files
    md_files = []
    for pattern in ['*.md', 'docs/*.md', 'docs/**/*.md']:
        md_files.extend(glob.glob(pattern, recursive=True))
    
    # Remove duplicates and sort
    md_files = sorted(list(set(md_files)))
    
    print(f"Found {len(md_files)} markdown files to process:")
    for file_path in md_files:
        print(f"  - {file_path}")
    
    print("\n" + "=" * 60)
    
    # Process each file
    processed_count = 0
    fixed_count = 0
    
    for file_path in md_files:
        processed_count += 1
        if process_file(file_path):
            fixed_count += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 Processing Complete!")
    print(f"Files processed: {processed_count}")
    print(f"Files with fixes: {fixed_count}")
    
    if fixed_count > 0:
        print("\n🎨 Applied Eye-Catching Themes:")
        themes = get_eye_catching_themes()
        for theme_key, theme_data in themes.items():
            print(f"  • {theme_data['name']} - {theme_key.title()} diagrams")
        
        print("\n✨ Features Applied:")
        print("  • Latest Mermaid v11.12.2+ syntax")
        print("  • GitHub dark mode optimization")
        print("  • Intelligent node classification")
        print("  • Professional color schemes")
        print("  • Comprehensive styling classes")
        print("  • Responsive design configuration")
        
        print("\n📋 Next Steps:")
        print("  1. Review the updated diagrams")
        print("  2. Test on GitHub or mermaid-drawing.com")
        print("  3. Commit and push changes")
        print("  4. Verify rendering in PR preview")

if __name__ == "__main__":
    main()

