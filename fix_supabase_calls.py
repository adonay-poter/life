import os
import re

CONTEXT_FILES = [
    'src/context/TaskProjectContext.tsx',
    'src/context/InboxContext.tsx',
    'src/context/AcademyContext.tsx',
    'src/context/HabitContext.tsx',
    'src/context/JournalContext.tsx'
]

for filepath in CONTEXT_FILES:
    with open(filepath, 'r') as f:
        content = f.read()

    # Find `await supabase.from(...)...;` and replace with `const { error } = await supabase.from(...)...; if (error) throw error;`
    # Warning: some lines might be `const [res1, res2] = await Promise.all(...)`. We only want to replace standalone supabase calls.
    # Pattern to match: `await supabase.from([^;]+);` where it's not assigned to a variable.
    
    # We can use regex to safely replace `await supabase.from` lines that start with `await supabase.from`
    
    # Let's use a simpler regex
    def replacer(match):
        stmt = match.group(0)
        return f"const {{ error }} = {stmt}\n        if (error) throw error;"

    # Matches `await supabase.from(...).insert/update/delete(...);` optionally indented.
    # But only if it's not assigned.
    content = re.sub(r'(?<!=\s)await supabase\.from\([^;]+;', replacer, content)

    with open(filepath, 'w') as f:
        f.write(content)

