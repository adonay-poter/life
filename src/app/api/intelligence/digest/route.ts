import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let date = '';
  let inboxItems: any[] = [];
  let tasks: any[] = [];
  let knowledgeItems: any[] = [];
  let journalEntries: any[] = [];
  let model = 'gemini-2.5-flash';

  try {
    const body = await request.json();
    date = body.date || '';
    inboxItems = body.inboxItems || [];
    tasks = body.tasks || [];
    knowledgeItems = body.knowledgeItems || [];
    journalEntries = body.journalEntries || [];
    model = body.model || 'gemini-2.5-flash';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    // Format the user's data for the prompt
    const formattedInbox = inboxItems
      .map((item: any) => `- [${item.type}] Title: "${item.title}" | Status: ${item.status}${item.content ? ` | Content: ${item.content}` : ''}`)
      .join('\n');

    const formattedTasks = tasks
      .map((task: any) => `- Name: "${task.name}" | Status: ${task.status} | Priority: ${task.priority}${task.due_date ? ` | Due: ${task.due_date}` : ''}`)
      .join('\n');

    const formattedKnowledge = knowledgeItems
      .map((item: any) => `- Note: "${item.title}" | Topic: ${item.topic || 'none'}${item.summary ? ` | Summary: ${item.summary}` : ''}`)
      .join('\n');

    const formattedJournal = journalEntries
      .map((entry: any) => `- Intentions: ${JSON.stringify(entry.morning_intentions || [])} | Reflections Learned: ${JSON.stringify(entry.evening_reflections_learned || [])} | Free Text: "${entry.free_text || ''}"`)
      .join('\n');

    const prompt = `You are the core intelligence layer of LifeOS, a personal productivity and knowledge system.
Your task is to synthesize the user's activity, logs, and inputs for date ${date} into a cohesive, structured Intelligence Brief.

Here is the user's activity data for today:

### Inbox Captures Today
${formattedInbox || 'No inbox items captured today.'}

### Tasks Active Today
${formattedTasks || 'No tasks active today.'}

### Knowledge Notes Created Today
${formattedKnowledge || 'No knowledge notes created today.'}

### Journal Entries / Reflections Today
${formattedJournal || 'No journal entries today.'}

Based ONLY on this user data, generate an intelligence briefing in JSON format. Do not make up any facts or activities.
Provide the output strictly conforming to the JSON schema. Use direct, clear, and practical editorial phrasing. Avoid generic motivational fluff.
For Suggested Actions: identify high-value actions (e.g. converting a captured link to flashcards, scheduling an unscheduled task created from inbox, defining a next step for an active project, or answering an open question). Make sure suggested_actions specify a type of: "task", "note", "flashcard", "project_link", "archive", or "review".`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                summary: { type: 'STRING', description: 'A calm, direct, and concise summary of today\'s activities, focus areas, and overall highlights (1-2 sentences).' },
                themes: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      title: { type: 'STRING', description: 'A descriptive theme name, e.g. "Learning Systems" or "Design Aesthetics"' },
                      summary: { type: 'STRING', description: 'Brief explanation of how today\'s captures or notes cluster around this theme' },
                      related_item_ids: { type: 'ARRAY', items: { type: 'STRING' }, description: 'IDs of related captures/notes if any' },
                      suggested_action: { type: 'STRING', description: 'Recommended concrete action based on this theme' }
                    },
                    required: ['title', 'summary', 'related_item_ids', 'suggested_action']
                  }
                },
                important_insights: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      title: { type: 'STRING', description: 'Key takeaway title' },
                      content: { type: 'STRING', description: 'Detailed insight content' },
                      why_it_matters: { type: 'STRING', description: 'Explanation of why this insight is valuable' }
                    },
                    required: ['title', 'content', 'why_it_matters']
                  }
                },
                open_questions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      question: { type: 'STRING', description: 'A question captured in notes/inbox today that remains unresolved' },
                      suggested_next_step: { type: 'STRING', description: 'First step to answer this question' }
                    },
                    required: ['question', 'suggested_next_step']
                  }
                },
                suggested_actions: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      type: { type: 'STRING', description: 'Must be one of: "task", "note", "flashcard", "project_link", "archive", "review"' },
                      title: { type: 'STRING', description: 'Concise action description' },
                      reason: { type: 'STRING', description: 'Why this is recommended based on today\'s items' }
                    },
                    required: ['type', 'title', 'reason']
                  }
                },
                tomorrow_inherits: { type: 'STRING', description: 'One focus area or unresolved item that should carry over into tomorrow\'s schedule' }
              },
              required: ['summary', 'themes', 'important_insights', 'open_questions', 'suggested_actions', 'tomorrow_inherits']
            }
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      throw new Error('No valid response from Gemini');
    }

    const result = JSON.parse(rawJsonText.trim());
    return NextResponse.json(result);
  } catch (err: any) {
    console.warn('Intelligence Digest API: Gemini call failed, falling back to local computation. Error:', err.message || err);
    
    try {
      const inboxTypes = inboxItems.map((i: any) => i.type || 'capture');
      const uniqueTypes = Array.from(new Set(inboxTypes));
      
      const themes = uniqueTypes.map((type: any) => {
        const itemsOfType = inboxItems.filter((i: any) => i.type === type);
        return {
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Cluster`,
          summary: `You captured ${itemsOfType.length} items of type "${type}" today.`,
          related_item_ids: itemsOfType.slice(0, 3).map((i: any) => i.id),
          suggested_action: `Triage and review your captured ${type} slips.`
        };
      });

      const open_questions = inboxItems
        .filter((i: any) => i.title?.includes('?') || (i.content && i.content.includes('?')))
        .map((i: any) => ({
          question: i.title,
          suggested_next_step: 'Research this topic or convert to a study card.'
        }));

      const suggested_actions: any[] = [];
      if (inboxItems.some((i: any) => i.status === 'unprocessed' || i.status === 'unsorted')) {
        suggested_actions.push({
          type: 'review',
          title: 'Triage unprocessed captures',
          reason: 'You have unprocessed captures waiting in the inbox.'
        });
      }
      tasks.filter((t: any) => t.status !== 'done' && t.priority === 'high').forEach((t: any) => {
        suggested_actions.push({
          type: 'task',
          title: `Advance: "${t.name}"`,
          reason: 'High priority task requiring focus.'
        });
      });

      const fallbackResult = {
        summary: `Local Calibrator Active (Gemini API key is blocked/leaked). System metrics: ${inboxItems.length} captures recorded, ${tasks.filter((t: any) => t.status === 'done').length} tasks completed today.`,
        themes: themes.slice(0, 3),
        important_insights: [
          {
            title: 'System Capture Rate',
            content: `You captured ${inboxItems.length} new inputs today.`,
            why_it_matters: 'Capturing inputs keeps them out of working memory, reducing cognitive load.'
          }
        ],
        open_questions: open_questions.slice(0, 3),
        suggested_actions: suggested_actions.slice(0, 4),
        tomorrow_inherits: 'Triage outstanding captures and organize task priorities.'
      };

      return NextResponse.json(fallbackResult);
    } catch (fallbackErr: any) {
      console.error('Failed to generate local fallback:', fallbackErr);
      return NextResponse.json({ error: 'Failed to generate local fallback: ' + fallbackErr.message }, { status: 500 });
    }
  }
}
