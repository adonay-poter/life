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

    # 1. Add useToast import if not present
    if 'useToast' not in content:
        content = content.replace("import { useSystem } from './SystemContext';", "import { useSystem } from './SystemContext';\nimport { useToast } from './ToastContext';")
        content = content.replace("import { useSystem, SystemProvider } from './SystemContext';", "import { useSystem, SystemProvider } from './SystemContext';\nimport { useToast } from './ToastContext';")

    # 2. Add const { showToast } = useToast(); inside the Provider if not present
    provider_match = re.search(r'export const \w+Provider: React\.FC<[^>]+> = \([^)]+\) => {', content)
    if provider_match:
        provider_def = provider_match.group(0)
        if 'const { showToast } = useToast();' not in content:
            content = content.replace(provider_def, provider_def + '\n  const { showToast } = useToast();')

    # 3. We can't simply regex replace all mutations easily because they have complex bodies.
    # Actually, the user says "wrap the mutation functions in DashboardContext.tsx (and other contexts) in try/catch blocks"
    # Let's check how many mutations we have.
    
    with open(filepath, 'w') as f:
        f.write(content)

