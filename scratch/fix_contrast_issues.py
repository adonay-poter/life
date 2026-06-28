import os
import re

def process_file(filepath):
    print(f"Processing: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Replace text-[#2C2D30] with text-primary
    content = re.sub(r'text-\[#2C2D30\]', 'text-primary', content, flags=re.IGNORECASE)
    
    # 2. Replace text-white with text-on-primary when in the same class list as bg-primary or bg-tertiary
    # Match pattern where bg-primary/bg-tertiary is first, followed by classes and then text-white
    content = re.sub(r'\b(bg-primary|bg-tertiary)\b([^"\'`]*?)\btext-white\b', r'\1\2text-on-primary', content)
    # Match pattern where text-white is first, followed by classes and then bg-primary/bg-tertiary
    content = re.sub(r'\btext-white\b([^"\'`]*?)\b(bg-primary|bg-tertiary)\b', r'text-on-primary\1\2', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Updated!")
    else:
        print(f"  No changes.")

def main():
    src_dir = 'src'
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                process_file(filepath)

if __name__ == '__main__':
    main()
