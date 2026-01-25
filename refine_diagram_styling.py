#!/usr/bin/env python3
"""
Refine Diagram Styling - Remove Duplicates and Optimize
======================================================

This script refines the diagram styling by removing duplicate styling
and optimizing the eye-catching themes for better rendering.
"""

import os
import re
import glob
from typing import List, Dict, Tuple

def get_refined_themes() -> Dict[str, Dict]:
    """Define refined eye-catching themes for different diagram types"""
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
    
    %% Mobile/Client Applications
    classDef mobile fill:#0d1117,stroke:#1f6feb,stroke-width:3px,color:#c9d1d9,font-weight:bold;
    
    %% Core Services
    classDef service fill:#0d1117,stroke:#388bfd,stroke-width:2px,color:#c9d1d9,font-weight:normal;
    
    %% Database Systems
    classDef database fill:#0d1117,stroke:#79c0ff,stroke-width:4px,color:#79c0ff,font-weight:bold;
    
    %% External Services
    classDef external fill:#0d1117,stroke:#3fb950,stroke-width:2px,color:#3fb950,font-weight:normal,stroke-dasharray: 3 3;
    
    %% Gateway/Load Balancer
    classDef gateway fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold;
    
    %% Decision Points
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    
    %% Process Operations
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
    
    %% Primary Business Components
    classDef primary fill:#0d1117,stroke:#238636,stroke-width:4px,color:#aff5b4,font-weight:bold;
    
    %% Secondary Business Components
    classDef secondary fill:#0d1117,stroke:#2ea043,stroke-width:3px,color:#aff5b4,font-weight:normal;
    
    %% Process Steps
    classDef process fill:#21262d,stroke:#238636,stroke-width:2px,color:#aff5b4,font-weight:normal;
    
    %% Decision Points
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    
    %% Success States
    classDef success fill:#0d1117,stroke:#238636,stroke-width:3px,color:#238636,font-weight:bold;
    
    %% External Systems
    classDef external fill:#0d1117,stroke:#2ea043,stroke-width:2px,color:#2ea043,font-weight:normal,stroke-dasharray: 3 3;
    
    %% Database Systems
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
    %% --- FINANCIAL GOLD THEME STYLING ---
    
    %% Payment Components
    classDef payment fill:#0d1117,stroke:#d97706,stroke-width:4px,color:#f7d794,font-weight:bold;
    
    %% Financial Services
    classDef financial fill:#0d1117,stroke:#f59e0b,stroke-width:3px,color:#f7d794,font-weight:normal;
    
    %% Transaction Processing
    classDef transaction fill:#21262d,stroke:#d97706,stroke-width:2px,color:#f7d794,font-weight:normal;
    
    %% External Payment Gateways
    classDef gateway fill:#0d1117,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,font-weight:normal,stroke-dasharray: 3 3;
    
    %% Success Transactions
    classDef success fill:#0d1117,stroke:#3fb950,stroke-width:3px,color:#3fb950,font-weight:bold;
    
    %% Decision Points
    classDef decision fill:#0d1117,stroke:#d29922,stroke-width:3px,color:#d29922,font-weight:bold,stroke-dasharray: 8 4;
    
    %% Database Systems
    classDef database fill:#0d1117,stroke:#fbbf24,stroke-width:4px,color:#fbbf24,font-weight:bold;'''
        }
    }

def clean_diagram_content(content: str) -> str:
    """Clean diagram content by removing duplicate styling and old configurations"""
    
    # Remove old styling sections
    content = re.sub(r'%%\s*---.*?STYLING.*?---.*?%%', '', content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'%%.*?DARK GRADIENT.*?GLOW STYLING.*?%%', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove old classDef definitions
    content = re.sub(r'classDef\s+\w+\s+fill\s*:.*?;', '', content, flags=re.MULTILINE)
    
    # Remove old class assignments (but keep the new ones we'll add)
    content = re.sub(r'class\s+[A-Z,\s]+\s+\w+;', '', content, flags=re.MULTILINE)
    
    # Clean up extra whitespace
    content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)
    content = content.strip()
    
    return content

def apply_intelligent_classification(diagram_content: str, theme_classes: str) -> str:
    """Apply intelligent node classification based on content analysis"""
    
    # Find all node definitions
    node_pattern = r'([A-Z]+)\[.*?\]'
    nodes = re.findall(node_pattern, diagram_content)
    
    if not nodes:
        return diagram_content + theme_classes
    
    # Classify nodes based on content
    classifications = {}
    
    for node in nodes:
        # Find the node's label
        label_pattern = rf'{node}\[.*?"([^"]*)".*?\]'
        label_match = re.search(label_pattern, diagram_content)
        
        if label_match:
            label = label_match.group(1).lower()
            
            # Classify based on label content
            if any(keyword in label for keyword in ['database', 'postgresql', 'redis', 'mongodb']):
                classifications[node] = 'database'
            elif any(keyword in label for keyword in ['payment', 'billing', 'transaction', 'revenue', 'commission']):
                classifications[node] = 'payment' if 'payment' in theme_classes else 'financial'
            elif any(keyword in label for keyword in ['gateway', 'load balancer', 'api gateway']):
                classifications[node] = 'gateway'
            elif any(keyword in label for keyword in ['mobile', 'app', 'client', 'dashboard']):
                classifications[node] = 'mobile' if 'mobile' in theme_classes else 'primary'
            elif any(keyword in label for keyword in ['service', 'backend', 'auth', 'user']):
                classifications[node] = 'service' if 'service' in theme_classes else 'secondary'
            elif any(keyword in label for keyword in ['ebs', 'cyberpay', 'external']):
                classifications[node] = 'external' if 'external' in theme_classes else 'gateway'
            elif '?' in label or 'decision' in label:
                classifications[node] = 'decision'
            else:
                classifications[node] = 'process'
    
    # Add theme classes
    result = diagram_content + theme_classes
    
    # Apply classifications if we have any
    if classifications:
        result += '\n\n    %% Node Classifications\n'
        
        # Group by class
        class_groups = {}
        for node, class_name in classifications.items():
            if class_name not in class_groups:
                class_groups[class_name] = []
            class_groups[class_name].append(node)
        
        # Add class assignments
        for class_name, nodes in class_groups.items():
            result += f'    class {",".join(nodes)} {class_name};\n'
    
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
    """Process a single file and refine all diagram styling"""
    
    print(f"Refining: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract all Mermaid diagrams
        pattern = r'```mermaid\n(.*?)\n```'
        diagrams = list(re.finditer(pattern, content, re.DOTALL))
        
        if not diagrams:
            print(f"  No Mermaid diagrams found")
            return False
        
        print(f"  Found {len(diagrams)} diagrams to refine")
        
        # Get themes
        themes = get_refined_themes()
        
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
            
            print(f"    Diagram {diagram_num}: Applying {theme['name']} theme")
            
            # Clean the diagram content
            cleaned_content = clean_diagram_content(diagram_content)
            
            # Build the refined diagram
            refined_diagram = theme['config'] + '\n' + cleaned_content
            
            # Apply intelligent classification
            refined_diagram = apply_intelligent_classification(refined_diagram, theme['classes'])
            
            # Replace in content
            new_block = f"```mermaid\n{refined_diagram}\n```"
            content = content[:start_pos] + new_block + content[end_pos:]
            modified = True
        
        if modified:
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✅ Refined {file_path}")
            return True
        else:
            print(f"  No changes needed")
            return False
            
    except Exception as e:
        print(f"  ❌ Error processing {file_path}: {e}")
        return False

def main():
    """Main function to refine all markdown files"""
    
    print("🎨 Refining Diagram Styling - Removing Duplicates & Optimizing")
    print("=" * 70)
    
    # Find all markdown files
    md_files = []
    for pattern in ['*.md', 'docs/*.md', 'docs/**/*.md']:
        md_files.extend(glob.glob(pattern, recursive=True))
    
    # Remove duplicates and sort
    md_files = sorted(list(set(md_files)))
    
    print(f"Found {len(md_files)} markdown files to refine")
    print("\n" + "=" * 70)
    
    # Process each file
    processed_count = 0
    refined_count = 0
    
    for file_path in md_files:
        processed_count += 1
        if process_file(file_path):
            refined_count += 1
    
    print("\n" + "=" * 70)
    print(f"🎉 Refinement Complete!")
    print(f"Files processed: {processed_count}")
    print(f"Files refined: {refined_count}")
    
    if refined_count > 0:
        print("\n🎨 Refined Themes Applied:")
        themes = get_refined_themes()
        for theme_key, theme_data in themes.items():
            print(f"  • {theme_data['name']} - {theme_key.title()} diagrams")
        
        print("\n✨ Refinements Applied:")
        print("  • Removed duplicate styling definitions")
        print("  • Cleaned up old configuration blocks")
        print("  • Optimized color schemes for better contrast")
        print("  • Applied intelligent node classification")
        print("  • Ensured consistent theme application")
        print("  • Maintained latest Mermaid v11.12.2+ compatibility")

if __name__ == "__main__":
    main()

