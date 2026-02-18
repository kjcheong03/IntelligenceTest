import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const ARG_SYSTEM_PROMPT = `You are an expert writing evaluator. You must respond only in valid JSON format.`;

const CRE_SYSTEM_PROMPT = `You are an expert creative writing evaluator. You must respond only in valid JSON format.`;

function buildArgPrompt(prompt, text) {
    return `You are an expert writing evaluator. Grade the following argumentative paragraph based on this rubric. Each dimension is scored 1-4.

PROMPT given to the writer: "${prompt}"

RUBRIC:
1. Thesis & Focus: 4=Clear, arguable, focused thesis | 3=Clear thesis, may be broad | 2=Unclear or non-arguable thesis | 1=No discernible thesis
2. Evidence & Support: 4=Strong, relevant, well-explained | 3=Relevant but may lack explanation | 2=Weak or irrelevant | 1=No evidence provided
3. Structure & Coherence: 4=Logical, clear flow with effective transitions | 3=Generally organized, some lapses | 2=Disorganized or difficult to follow | 1=Lacks any clear structure
4. Syntax & Fluency: 4=Varied, complex sentences; flows smoothly | 3=Mostly clear, some variety | 2=Simple, repetitive, or awkward | 1=Incoherent sentences
5. Word Choice: 4=Precise, persuasive, appropriate language | 3=Appropriate but general | 2=Vague or inappropriate | 1=Severely limited vocabulary

STUDENT'S WRITING:
"""
${text}
"""

Respond in JSON format:
{
  "scores": {
    "thesis_focus": <1-4>,
    "evidence_support": <1-4>,
    "structure_coherence": <1-4>,
    "syntax_fluency": <1-4>,
    "word_choice": <1-4>
  },
  "feedback": "<2-3 sentences of overall feedback>"
}`;
}

function buildCrePrompt(prompt, text) {
    return `You are an expert creative writing evaluator. Grade the following creative story opening based on this rubric. Each dimension is scored 1-4.

IMAGE PROMPT given to the writer: "${prompt}"

RUBRIC:
1. Originality: 4=Highly imaginative and unconventional concept | 3=Conventional concept with unique elements | 2=Predictable or clichéd | 1=Lacks any originality
2. Imagery & Detail: 4=Rich, specific sensory details create a vivid world | 3=Uses general sensory details | 2=Minimal or generic details | 1=No sensory details
3. Narrative Structure: 4=Coherent plot with clear setup and progression | 3=Basic plot present but may be underdeveloped | 2=Plot is confusing or disjointed | 1=No discernible plot
4. Figurative Language: 4=Effective and original use of metaphor, simile, etc. | 3=Uses simple or common figurative language | 2=Figurative language is weak or misused | 1=No figurative language
5. Pacing & Rhythm: 4=Sentence structure is varied to control pacing and mood | 3=Some variation in sentence structure | 2=Monotonous or awkward sentence structure | 1=Incoherent sentences

STUDENT'S WRITING:
"""
${text}
"""

Respond in JSON format:
{
  "scores": {
    "originality": <1-4>,
    "imagery_detail": <1-4>,
    "narrative_structure": <1-4>,
    "figurative_language": <1-4>,
    "pacing_rhythm": <1-4>
  },
  "feedback": "<2-3 sentences of overall feedback>"
}`;
}

export async function POST(request) {
    try {
        const { type, prompt, text } = await request.json();

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        const systemPrompt = type === 'argumentative' ? ARG_SYSTEM_PROMPT : CRE_SYSTEM_PROMPT;
        const userPrompt = type === 'argumentative'
            ? buildArgPrompt(prompt, text)
            : buildCrePrompt(prompt, text);

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0].message.content);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Grading error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to grade writing' },
            { status: 500 }
        );
    }
}
