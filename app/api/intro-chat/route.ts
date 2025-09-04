import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_KEY,
});

// Feature switch - set to 'openai' or 'claude'
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

// Intro chat questions with conversational, engaging style
const INTRO_QUESTIONS = [
  {
    id: 0,
    field: 'whatTheyreDoing',
    question: "Hi there! 👋 I'm excited to help bring your software idea to life. Let's start with the big picture - what are you trying to create?",
    followUp: "Tell me about your vision - what's the software project you have in mind?"
  },
  {
    id: 1, 
    field: 'projectType',
    question: "That sounds interesting! What kind of software are you building?\n\n• **Mobile app** - iOS, Android, or both?\n• **Web application** - runs in browsers\n• **Desktop software** - Windows, Mac, or Linux\n• **API/Backend service** - powers other apps\n• **Something else** - tell me what you have in mind!",
    followUp: "This helps me understand the technical approach we'll need."
  },
  {
    id: 2,
    field: 'audience', 
    question: "Perfect! Now, who will be using this software? Understanding your audience helps me recommend the right features and user experience.\n\n• **Just you or your team** (internal tool)\n• **Your customers or clients** (external users)\n• **General public** (consumer app)\n• **Specific professionals** (like doctors, teachers, etc.)\n• **Other** - tell me more about your users!",
    followUp: "Knowing your users helps me suggest the best design and functionality."
  },
  {
    id: 3,
    field: 'problem',
    question: "Great! What's the main problem this software will solve? What pain point or need does it address?\n\nI love hearing about the 'why' behind projects - it helps me understand what success looks like for you.",
    followUp: "Understanding the core problem helps me focus on the features that matter most."
  },
  {
    id: 4,
    field: 'timeline',
    question: "Excellent! When do you ideally want to have this up and running?\n\n• **ASAP** (within 2 weeks)\n• **Soon** (1-2 months)\n• **This quarter** (3 months)\n• **No rush** (6+ months)\n• **Just exploring** (timeline flexible)\n\nThis helps me recommend the right scope and approach for your timeframe.",
    followUp: "Timeline helps me suggest realistic features and tech choices."
  },
  {
    id: 5,
    field: 'teamSize',
    question: "Last question! What's your team situation?\n\n• **Solo developer** (just you)\n• **Small team** (2-4 people)\n• **Medium team** (5-10 people)\n• **Large team** (10+ people)\n• **Hiring/building team** (will grow)\n\nThis helps me recommend tools and processes that fit your team size.",
    followUp: "Team size affects everything from development tools to deployment strategy."
  }
];

// Smart question skipping logic - analyzes user answer for any question information
function getNextQuestionIndex(userAnswer: string, currentIndex: number): number {
  const answer = userAnswer.toLowerCase();
  const answeredQuestions = new Set<number>();
  
  // Check for project type indicators (question 1)
  if (answer.includes('mobile app') || answer.includes('mobile') || answer.includes('ios') || answer.includes('android') ||
      answer.includes('web app') || answer.includes('website') || answer.includes('web application') ||
      answer.includes('desktop') || answer.includes('windows') || answer.includes('mac') || answer.includes('linux') ||
      answer.includes('api') || answer.includes('backend') || answer.includes('service')) {
    answeredQuestions.add(1);
  }
  
  // Check for audience indicators (question 2)
  if (answer.includes('public') || answer.includes('consumer') || answer.includes('general public') ||
      answer.includes('customers') || answer.includes('clients') || answer.includes('external users') ||
      answer.includes('internal') || answer.includes('team') || answer.includes('just me') ||
      answer.includes('professionals') || answer.includes('doctors') || answer.includes('teachers')) {
    answeredQuestions.add(2);
  }
  
  // Check for problem/purpose indicators (question 3)
  if (answer.includes('solve') || answer.includes('problem') || answer.includes('helps') || answer.includes('for') ||
      answer.includes('tracking') || answer.includes('management') || answer.includes('organize') ||
      answer.includes('connect') || answer.includes('find') || answer.includes('book') || answer.includes('schedule')) {
    answeredQuestions.add(3);
  }
  
  // Check for timeline indicators (question 4)
  if (answer.includes('asap') || answer.includes('urgent') || answer.includes('quickly') || answer.includes('soon') ||
      answer.includes('month') || answer.includes('week') || answer.includes('quarter') || answer.includes('year') ||
      answer.includes('no rush') || answer.includes('flexible') || answer.includes('exploring')) {
    answeredQuestions.add(4);
  }
  
  // Check for team size indicators (question 5)
  if (answer.includes('solo') || answer.includes('just me') || answer.includes('alone') ||
      answer.includes('small team') || answer.includes('few people') || answer.includes('2-4') ||
      answer.includes('medium team') || answer.includes('5-10') || answer.includes('large team') ||
      answer.includes('hiring') || answer.includes('building team')) {
    answeredQuestions.add(5);
  }
  
  // Find next unanswered question
  for (let i = currentIndex + 1; i < INTRO_QUESTIONS.length; i++) {
    if (!answeredQuestions.has(i)) {
      return i;
    }
  }
  
  // If all questions answered, go to completion
  return INTRO_QUESTIONS.length;
}

// Extract answers from user response for auto-filling skipped questions
function extractAnswers(userAnswer: string): { [key: string]: string } {
  const answer = userAnswer.toLowerCase();
  const extracted: { [key: string]: string } = {};
  
  // Extract project type
  if (answer.includes('mobile app') || answer.includes('mobile') || answer.includes('ios') || answer.includes('android')) {
    extracted.projectType = 'mobile app';
  } else if (answer.includes('web app') || answer.includes('website') || answer.includes('web application')) {
    extracted.projectType = 'web application';
  } else if (answer.includes('desktop') || answer.includes('windows') || answer.includes('mac') || answer.includes('linux')) {
    extracted.projectType = 'desktop software';
  } else if (answer.includes('api') || answer.includes('backend') || answer.includes('service')) {
    extracted.projectType = 'API/Backend service';
  }
  
  // Extract audience
  if (answer.includes('public') || answer.includes('consumer') || answer.includes('general public')) {
    extracted.audience = 'general public';
  } else if (answer.includes('customers') || answer.includes('clients') || answer.includes('external users')) {
    extracted.audience = 'customers or clients';
  } else if (answer.includes('internal') || answer.includes('team') || answer.includes('just me')) {
    extracted.audience = 'just you or your team';
  } else if (answer.includes('professionals') || answer.includes('doctors') || answer.includes('teachers')) {
    extracted.audience = 'specific professionals';
  }
  
  // Extract problem/purpose (more flexible - capture key phrases)
  if (answer.includes('tracking') || answer.includes('track')) {
    extracted.problem = 'tracking and monitoring';
  } else if (answer.includes('management') || answer.includes('manage')) {
    extracted.problem = 'management and organization';
  } else if (answer.includes('connect') || answer.includes('social')) {
    extracted.problem = 'connecting people';
  } else if (answer.includes('book') || answer.includes('schedule')) {
    extracted.problem = 'booking and scheduling';
  }
  
  // Extract timeline
  if (answer.includes('asap') || answer.includes('urgent') || answer.includes('quickly')) {
    extracted.timeline = 'ASAP';
  } else if (answer.includes('soon') || answer.includes('month')) {
    extracted.timeline = 'soon';
  } else if (answer.includes('quarter')) {
    extracted.timeline = 'this quarter';
  } else if (answer.includes('no rush') || answer.includes('flexible') || answer.includes('exploring')) {
    extracted.timeline = 'no rush';
  }
  
  // Extract team size
  if (answer.includes('solo') || answer.includes('just me') || answer.includes('alone')) {
    extracted.teamSize = 'solo developer';
  } else if (answer.includes('small team') || answer.includes('few people') || answer.includes('2-4')) {
    extracted.teamSize = 'small team';
  } else if (answer.includes('medium team') || answer.includes('5-10')) {
    extracted.teamSize = 'medium team';
  } else if (answer.includes('large team')) {
    extracted.teamSize = 'large team';
  } else if (answer.includes('hiring') || answer.includes('building team')) {
    extracted.teamSize = 'hiring/building team';
  }
  
  return extracted;
}

// Engaging system prompt for intro chat - focused on rapport building
const INTRO_SYSTEM_PROMPT = `You are a friendly, enthusiastic project consultant helping someone describe their software project. Your job is to:

## Interaction Style
- **Conversational and friendly** - like talking to a knowledgeable friend
- **Encouraging and positive** - celebrate their ideas and vision
- **Repeat back what you hear** - show understanding and build connection
- **Smoothly restate** what they just said to build rapport (e.g., "So you're building a pickleball game - I love that!")
- **Ask follow-up questions** naturally when answers need clarification
- **Avoid technical jargon** - keep it accessible and engaging
- **Build excitement** about their project vision

## Current Context
You are conducting an intro conversation with 6 specific questions (0-5). Each response should:

1. **Acknowledge** their previous answer enthusiastically
2. **Reflect back** what you understood to show you're listening
3. **Ask the next question** in a natural, conversational way
4. **Explain briefly** why you're asking (builds trust)

## Important Guidelines
- Keep responses concise but warm (2-3 sentences max before the question)
- Use encouraging language like "That sounds amazing!" or "I love that idea!"
- Make them feel heard and understood
- Build anticipation for the architectural planning phase
- NO technical details or architecture discussion yet - save that for the architect phase

## Response Format
Always structure your response as:
1. Enthusiastic acknowledgment with restatement (e.g., "A pickleball game - that's awesome!")
2. Brief reflection of what you understood to show you're listening
3. Transition to next question naturally
4. The actual question with context/options when helpful

Remember: This is about building rapport and gathering high-level context, not technical planning yet!`;

export async function POST(request: NextRequest) {
  try {
    const { message, userSession, externalId = 'introUser123', isFirstMessage = false } = await request.json();

    if (!message || !userSession) {
      return NextResponse.json({ 
        error: 'Message and userSession required' 
      }, { status: 400 });
    }

    // For fresh conversations (first message), ignore existing intro brief and start fresh
    let introBrief;
    if (isFirstMessage) {
      // Delete any existing intro brief and create fresh one
      await prisma.introBrief.deleteMany({
        where: { userSession }
      });
      
      introBrief = await prisma.introBrief.create({
        data: {
          userSession,
          externalId,
          currentQuestion: 0,
          isComplete: false
        }
      });
    } else {
      // Get existing intro brief for ongoing conversation
      introBrief = await prisma.introBrief.findUnique({
        where: { userSession }
      });

      if (!introBrief) {
        introBrief = await prisma.introBrief.create({
          data: {
            userSession,
            externalId,
            currentQuestion: 0
          }
        });
      }
    }

    // Only check completion status for ongoing conversations, not fresh ones
    if (!isFirstMessage && introBrief.isComplete) {
      return NextResponse.json({
        text: "🎉 Great! Your intro is complete. Let me connect you with the architect to dive deeper into your project...",
        introComplete: true,
        introBrief: {
          whatTheyreDoing: introBrief.whatTheyreDoing,
          projectType: introBrief.projectType,
          audience: introBrief.audience,
          problem: introBrief.problem,
          timeline: introBrief.timeline,
          teamSize: introBrief.teamSize
        },
        projectBrief: introBrief.projectBrief
      });
    }

    // Process the current answer and update database
    const currentQ = introBrief.currentQuestion;
    
    // Save the answer to the current question (don't save for previous question)
    // This section is handled later in the flow

    // Check if we've completed all questions
    if (currentQ >= INTRO_QUESTIONS.length) {
      // Generate project brief and mark as complete
      return await completeIntroChat(userSession, externalId);
    }

    // Get next question
    const nextQuestion = INTRO_QUESTIONS[currentQ];
    let aiResponse;

    if (currentQ === 0 && !isFirstMessage) {
      // First question for ongoing conversation - just ask it directly
      aiResponse = nextQuestion.question;
    } else if (currentQ === 0 && isFirstMessage) {
      // For first user response, check for smart question skipping
      const nextQuestionIndex = getNextQuestionIndex(message, 0);
      let aiResponse;
      
      try {
        aiResponse = await callOpenAIForIntro('', message, INTRO_QUESTIONS[nextQuestionIndex].question);
      } catch (error) {
        console.error('Error generating AI response:', error);
        aiResponse = `${message} - that sounds amazing! I love that you're bringing this idea to life. ${INTRO_QUESTIONS[nextQuestionIndex].question}`;
      }
      
      // Update database with answer and next question index
      const updateData: any = {
        currentQuestion: nextQuestionIndex,
        [INTRO_QUESTIONS[0].field]: message,
        updatedAt: new Date()
      };
      
      // Auto-fill any skipped questions based on extracted answers
      const extractedAnswers = extractAnswers(message);
      for (let i = 1; i < nextQuestionIndex; i++) {
        const questionField = INTRO_QUESTIONS[i].field;
        if (extractedAnswers[questionField]) {
          updateData[questionField] = extractedAnswers[questionField];
        }
      }
      
      await prisma.introBrief.update({
        where: { userSession },
        data: updateData
      });
      
      return NextResponse.json({
        text: aiResponse,
        currentQuestion: nextQuestionIndex,
        totalQuestions: INTRO_QUESTIONS.length,
        progress: Math.round((nextQuestionIndex / INTRO_QUESTIONS.length) * 100)
      });
    } else {
      // For ongoing questions, also check for smart skipping
      const nextQuestionIndex = getNextQuestionIndex(message, currentQ);
      
      // Generate contextual response acknowledging their answer
      const contextPrompt = `
${INTRO_SYSTEM_PROMPT}

## Current Question Context
You just received the answer: "${message}"
This was for question ${currentQ}: ${INTRO_QUESTIONS[currentQ].question}

Now ask question ${nextQuestionIndex}: ${INTRO_QUESTIONS[nextQuestionIndex].question}

Remember to:
1. Enthusiastically acknowledge their answer WITH restatement (e.g., "A fitness tracking app - that sounds amazing!")
2. Show you understood what they said by smoothly restating it
3. Naturally transition to the next question
4. Keep it warm and conversational

EXAMPLE:
User: "fitness tracking app" → Response: "A fitness tracking app - that sounds amazing! I love that you're focusing on health and wellness..."
User: "mobile app" → Response: "A mobile app - perfect choice! Mobile is such a great platform..."
`;

      // Call AI to generate engaging response
      if (AI_PROVIDER === 'claude') {
        try {
          const response = await anthropic.messages.create({
            model: process.env.CLAUDE_MODEL || 'claude-opus-4-1-20250805',
            max_tokens: 1024,
            system: contextPrompt,
            messages: [
              {
                role: 'user',
                content: `Generate a warm, engaging response that acknowledges "${message}" and asks the next question naturally.`
              }
            ],
          });
          
          aiResponse = (response.content[0] as any)?.text || nextQuestion.question;
        } catch (error) {
          console.error('Claude error in intro chat:', error);
          // Fallback to OpenAI or default
          if (process.env.OPENAI_API_KEY) {
            aiResponse = await callOpenAIForIntro(contextPrompt, message, nextQuestion.question);
          } else {
            aiResponse = nextQuestion.question;
          }
        }
      } else {
        aiResponse = await callOpenAIForIntro(contextPrompt, message, INTRO_QUESTIONS[nextQuestionIndex].question);
      }
      
      // Update database with answer and next question index, plus auto-fill skipped questions
      const updateData: any = {
        currentQuestion: nextQuestionIndex,
        [INTRO_QUESTIONS[currentQ].field]: message,
        updatedAt: new Date()
      };
      
      // Auto-fill any skipped questions based on extracted answers
      const extractedAnswers = extractAnswers(message);
      for (let i = currentQ + 1; i < nextQuestionIndex; i++) {
        const questionField = INTRO_QUESTIONS[i].field;
        if (extractedAnswers[questionField]) {
          updateData[questionField] = extractedAnswers[questionField];
        }
      }
      
      await prisma.introBrief.update({
        where: { userSession },
        data: updateData
      });

      return NextResponse.json({
        text: aiResponse,
        currentQuestion: nextQuestionIndex,
        totalQuestions: INTRO_QUESTIONS.length,
        progress: Math.round((nextQuestionIndex / INTRO_QUESTIONS.length) * 100)
      });
    }

  } catch (error) {
    console.error('Intro chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process intro chat request' }, 
      { status: 500 }
    );
  }
}

async function callOpenAIForIntro(contextPrompt: string, userMessage: string, nextQuestion: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: `You are a friendly project consultant. When a user answers a question, acknowledge their answer enthusiastically by restating what they said, then naturally ask the next question. Keep responses warm and conversational (2-3 sentences max).

Examples:
- User: "fitness app" → "A fitness app - that sounds amazing! I love that you're focusing on health and wellness. What kind of software are you building?"
- User: "mobile app" → "Mobile app - perfect choice! Mobile is such a great platform for reaching users. Who will be using this software?"

Be enthusiastic but natural, and always restate what they said to show you're listening.` 
        },
        { 
          role: 'user', 
          content: `The user just answered: "${userMessage}". Acknowledge this enthusiastically by restating it, then ask: "${nextQuestion}"` 
        }
      ],
      max_completion_tokens: 200
    });

    return response.choices[0]?.message?.content || `${userMessage} - that sounds great! ${nextQuestion}`;
  } catch (error) {
    console.error('OpenAI error in intro chat:', error);
    return `${userMessage} - that sounds great! ${nextQuestion}`;
  }
}

async function completeIntroChat(userSession: string, externalId: string) {
  try {
    // Get the completed intro brief
    const introBrief = await prisma.introBrief.findUnique({
      where: { userSession }
    });

    if (!introBrief) {
      throw new Error('Intro brief not found');
    }

    // Generate project brief using AI
    const projectBrief = await generateProjectBrief({
      whatTheyreDoing: introBrief.whatTheyreDoing,
      projectType: introBrief.projectType,
      audience: introBrief.audience,
      problem: introBrief.problem,
      timeline: introBrief.timeline,
      teamSize: introBrief.teamSize
    });

    // Update intro brief as complete
    await prisma.introBrief.update({
      where: { userSession },
      data: {
        isComplete: true,
        projectBrief: projectBrief,
        updatedAt: new Date()
      }
    });

    // Track intro completion
    const currentMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
    await prisma.toolUsage.create({
      data: {
        externalId,
        usageType: 'intro_complete',
        userSession,
        month: currentMonth
      }
    });

    return NextResponse.json({
      text: `🎉 Perfect! I now have a great understanding of your project. Let me summarize what I heard:\n\n**Your Vision:** ${introBrief.whatTheyreDoing}\n**Project Type:** ${introBrief.projectType}\n**Target Users:** ${introBrief.audience}\n**Core Problem:** ${introBrief.problem}\n**Timeline:** ${introBrief.timeline}\n**Team Size:** ${introBrief.teamSize}\n\nI'm excited about your project! Now let's dive deeper with the architect to create a detailed technical plan. Ready to continue?`,
      introComplete: true,
      introBrief: {
        whatTheyreDoing: introBrief.whatTheyreDoing,
        projectType: introBrief.projectType,
        audience: introBrief.audience,
        problem: introBrief.problem,
        timeline: introBrief.timeline,
        teamSize: introBrief.teamSize
      },
      projectBrief: projectBrief
    });

  } catch (error) {
    console.error('Error completing intro chat:', error);
    return NextResponse.json(
      { error: 'Failed to complete intro chat' },
      { status: 500 }
    );
  }
}

async function generateProjectBrief(answers: any): Promise<string> {
  const briefPrompt = `Generate a concise project brief based on these intro answers:

What they're doing: ${answers.whatTheyreDoing}
Project type: ${answers.projectType}
Target audience: ${answers.audience}
Problem it solves: ${answers.problem}
Timeline: ${answers.timeline}
Team size: ${answers.teamSize}

Create a 2-3 sentence project brief that captures the essence of their project. This will be used to provide context to the technical architect.

Format: "The user wants to create [what] for [audience] that solves [problem]. It's a [type] with [timeline] timeline and [team] team size."`;

  try {
    if (AI_PROVIDER === 'claude') {
      const response = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-opus-4-1-20250805',
        max_tokens: 300,
        system: briefPrompt,
        messages: [
          { role: 'user', content: 'Generate the project brief.' }
        ],
      });
      
      return (response.content[0] as any)?.text || 'Project brief could not be generated.';
    } else {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: briefPrompt },
          { role: 'user', content: 'Generate the project brief.' }
        ]
      });

      return response.choices[0]?.message?.content || 'Project brief could not be generated.';
    }
  } catch (error) {
    console.error('Error generating project brief:', error);
    return `The user wants to create ${answers.whatTheyreDoing} for ${answers.audience} that solves ${answers.problem}. It's a ${answers.projectType} with ${answers.timeline} timeline and ${answers.teamSize} team size.`;
  }
}

// GET endpoint to retrieve intro brief progress
export async function GET(request: NextRequest) {
  try {
    const userSession = request.nextUrl.searchParams.get('userSession');

    if (!userSession) {
      return NextResponse.json({ error: 'userSession required' }, { status: 400 });
    }

    const introBrief = await prisma.introBrief.findUnique({
      where: { userSession }
    });

    if (!introBrief) {
      return NextResponse.json({
        exists: false,
        currentQuestion: 0,
        totalQuestions: INTRO_QUESTIONS.length,
        progress: 0
      });
    }

    return NextResponse.json({
      exists: true,
      currentQuestion: introBrief.currentQuestion,
      totalQuestions: INTRO_QUESTIONS.length,
      progress: Math.round((introBrief.currentQuestion / INTRO_QUESTIONS.length) * 100),
      isComplete: introBrief.isComplete,
      answers: {
        whatTheyreDoing: introBrief.whatTheyreDoing,
        projectType: introBrief.projectType,
        audience: introBrief.audience,
        problem: introBrief.problem,
        timeline: introBrief.timeline,
        teamSize: introBrief.teamSize
      },
      projectBrief: introBrief.projectBrief
    });

  } catch (error) {
    console.error('Get intro brief error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve intro brief' },
      { status: 500 }
    );
  }
}