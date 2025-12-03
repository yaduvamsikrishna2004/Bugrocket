import { google } from '@ai-sdk/google';
import { streamText, convertToCoreMessages } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, mode } = await req.json();

  const prompts = {
    // 🔵 BUILDER PERSONA
    chat: `You are BugRocket, an elite Senior Software Engineer. 
           - Your goal is to write clean, modern, efficient code.
           - Be concise. Do not waste time with small talk.
           - If writing React, prefer functional components and Hooks.`,
           
    // 🔴 FIXER PERSONA
    debug: `You are a Strict Code Auditor.
            - Your ONLY goal is to find bugs, logic errors, and security risks.
            - Analyze the user's code or error logs.
            - Provide the FIXED code block immediately after the explanation.`
  };

  // Default to chat if mode is missing
  const system = mode === 'debug' ? prompts.debug : prompts.chat;

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: system,
    messages: convertToCoreMessages(messages),
  });

  return (await result).toDataStreamResponse();
}