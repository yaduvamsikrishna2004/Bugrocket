import { NextResponse } from 'next/server';

// Using Pollinations.ai for free, keyless image generation for this demo.
// You could swap this out for DALL-E 3 or Stable Diffusion API calls later.
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    // 1. URL encode the prompt
    const encodedPrompt = encodeURIComponent(prompt);

    // 2. Add a random seed to ensure different images for the same prompt
    const randomSeed = Math.floor(Math.random() * 1000000);

    // 3. Construct the URL (Pollinations generates directly from URL)
    // Adding nologo=true for cleaner output
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${randomSeed}&nologo=true`;

    // Return the URL as a JSON object
    return NextResponse.json({ imageUrl });

  } catch (error) {
    console.error("[IMAGE_GEN]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}