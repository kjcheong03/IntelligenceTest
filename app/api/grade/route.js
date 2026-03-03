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

EXAMPLES FOR REFERENCE:
5/20 (Weak)
Social media is sometimes good but mostly bad. People use it too much and it causes many problems. It makes people addicted and they don’t talk to others. Also, fake news spreads easily. I think it is more harmful than useful because it ruins communication between people. Overall, social media is not very good and people should stop using it so much.
Comments: Unclear focus, repetitive wording, no evidence or structure beyond surface-level claims. Very basic vocabulary and weak syntax.

10/20 (Fair)
Social media has changed the way people connect, but it often creates more harm than help. Many young people spend hours online, causing mental health issues like anxiety and insecurity. Though platforms aim to build communities, they also promote unrealistic lifestyles that make users feel inadequate. However, some positive effects exist, such as easier communication, but overall, the negatives outweigh the benefits.
Comments: Clear stance and some relevant support, but lacks depth, logical progression, and polished transitions. Average for mid-level undergrad writing.

15/20 (Good)
While social media has expanded access to information and global communication, it has inflicted deeper harm on societal well-being. The constant exposure to curated images fosters comparison, eroding self-esteem and trust. Moreover, algorithms reward outrage and misinformation, polarizing communities. Although it offers platforms for activism and learning, these positives rarely overcome its pervasive psychological and social costs. Thus, social media’s influence, while empowering, has become a net detriment to modern society.
Comments: Clear thesis, coherent structure, balanced reasoning. Strong vocabulary and syntax with nuance, but could use more stylistic flair or originality for top-tier work.

20/20 (Excellent)
Social media, once hailed as a democratizing force, has subtly corroded the fabric of modern society. By monetizing attention, it trades human connection for engagement metrics, rewarding anger over empathy. Misinformation flourishes not from malice but from design, fracturing shared truth into echo chambers of convenience. Even as it amplifies marginalized voices, it also dilutes meaning, turning activism into performance. Its harm lies not in what it shows us, but in what it teaches us to value—reaction over reflection, visibility over authenticity.
Comments: Sophisticated thesis with conceptual depth, precise structure, evocative word choice, elegant rhythm. Fully merits 20/20.

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

PROMPT given to the writer: "${prompt}"

RUBRIC:
1. Originality: 4=Highly imaginative and unconventional concept | 3=Conventional concept with unique elements | 2=Predictable or clichéd | 1=Lacks any originality
2. Imagery & Detail: 4=Rich, specific sensory details create a vivid world | 3=Uses general sensory details | 2=Minimal or generic details | 1=No sensory details
3. Narrative Structure: 4=Coherent plot with clear setup and progression | 3=Basic plot present but may be underdeveloped | 2=Plot is confusing or disjointed | 1=No discernible plot
4. Figurative Language: 4=Effective and original use of metaphor, simile, etc. | 3=Uses simple or common figurative language | 2=Figurative language is weak or misused | 1=No figurative language
5. Pacing & Rhythm: 4=Sentence structure is varied to control pacing and mood | 3=Some variation in sentence structure | 2=Monotonous or awkward sentence structure | 1=Incoherent sentences

EXAMPLES FOR REFERENCE:
5/20 (Weak)
Red is a colour that is bright and strong. It is the colour of apples and blood. It feels hot and maybe a little angry. People use red to show danger or love. It is a very powerful colour. If you could feel it, maybe it would be like touching something warm.
Comments: Basic and literal; no vivid imagery or originality. Reads like a dictionary description.

10/20 (Fair)
Red is the warmth of the sun on your skin and the sting of a small cut. It’s the taste of something sweet and sharp, like strawberries. People use red when they want to stand out or say “stop.” It can mean both love and anger, which makes it confusing but interesting. Red is not quiet—it feels like noise.
Comments: Contains sensory associations, but lacks narrative rhythm and fresh imagery. Adequate but conventional.

15/20 (Good)
Red lives in the rush of your heartbeat when you’re scared or thrilled. It’s the warmth that spreads from your chest when someone says your name with affection. Imagine the crackle of a fire close enough to feel, the taste of metal and ripe fruit mingled together. Red is energy—sometimes love, sometimes fury—but always alive.
Comments: Strong emotional tone and sensory layering. Good rhythm and flow, though could use a sharper metaphor or subtler pacing for full marks.

20/20 (Excellent)
Red is the echo of life itself—a pulse beneath the skin. It’s the shiver before a kiss and the roar before a storm. It tastes like rust and ripened cherries, hums like a held breath, burns like the truth you can’t swallow. Red doesn’t sit still; it surges, demanding to be felt rather than seen. If colour had a heartbeat, it would beat red.
Comments: Vividly original, emotionally charged, and rhythmically balanced. Skillful metaphors and sensory synthesis make it outstanding.

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
