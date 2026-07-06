import { estimateTokensFromText } from './tokenEstimate';

export type SoulBlueprintSectionKey = 'core' | 'projects' | 'learning' | 'journal' | 'review' | 'full';

export interface SoulBlueprintSnapshot {
  id: string;
  user_id: string;
  version: number;
  content_markdown: string;
  content_json: Record<string, unknown>;
  core_markdown: string | null;
  projects_markdown: string | null;
  learning_markdown: string | null;
  journal_markdown: string | null;
  review_markdown: string | null;
  token_estimate: number | null;
  source_hash: string | null;
  last_event_id: string | null;
  window_start: string | null;
  window_end: string | null;
  generated_at: string;
  created_at: string;
}

export const SOUL_BLUEPRINT_SECTION_LABELS: Record<SoulBlueprintSectionKey, string> = {
  core: 'Core',
  projects: 'Projects',
  learning: 'Learning',
  journal: 'Journal',
  review: 'Review',
  full: 'Full Markdown',
};

export function getSoulBlueprintSectionContent(
  snapshot: SoulBlueprintSnapshot | null,
  section: SoulBlueprintSectionKey
): string {
  if (!snapshot) return '';

  switch (section) {
    case 'core':
      return snapshot.core_markdown || '';
    case 'projects':
      return snapshot.projects_markdown || '';
    case 'learning':
      return snapshot.learning_markdown || '';
    case 'journal':
      return snapshot.journal_markdown || '';
    case 'review':
      return snapshot.review_markdown || '';
    case 'full':
    default:
      return snapshot.content_markdown || '';
  }
}

export function getRelevantSoulBlueprintSections(question: string): SoulBlueprintSectionKey[] {
  const normalized = question.toLowerCase();
  const sections: SoulBlueprintSectionKey[] = ['core'];

  if (/(project|projects|task|tasks|work|plan|planning|execute|execution|deadline|ship|deliver)/.test(normalized)) {
    sections.push('projects');
  }

  if (/(learning|academy|note|notes|flashcard|flashcards|course|courses|research|study|module|lesson)/.test(normalized)) {
    sections.push('learning');
  }

  if (/(reflect|reflection|mood|energy|pattern|patterns|habit|habits|journal|personal review)/.test(normalized)) {
    sections.push('journal');
  }

  if (/(review|weekly|priority|priorities|stale|open loop|open loops|backlog|queue|triage)/.test(normalized)) {
    sections.push('review');
  }

  return Array.from(new Set(sections));
}

export function buildSoulBlueprintChatContext(
  snapshot: SoulBlueprintSnapshot | null,
  question: string
): { sections: SoulBlueprintSectionKey[]; markdown: string; tokenEstimate: number } {
  if (!snapshot) {
    return {
      sections: [],
      markdown: '',
      tokenEstimate: 0,
    };
  }

  const sections = getRelevantSoulBlueprintSections(question);
  const markdown = sections
    .map((section) => getSoulBlueprintSectionContent(snapshot, section))
    .filter(Boolean)
    .join('\n\n---\n\n');

  return {
    sections,
    markdown,
    tokenEstimate: estimateTokensFromText(markdown),
  };
}
