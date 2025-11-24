import { GoogleGenerativeAI, StreamingMode } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { messages, currentEditorCode, language } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request body: messages[] missing", {
        status: 400,
      });
    }

    // Last user message is what we respond to
    const latestMessage = messages[messages.length - 1]?.content || "";

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: `
You are an AI coding assistant inside a collaborative code editor.

Rules:
- Give clean, accurate, helpful answers.
- If the user asks to fix code, provide corrected code blocks.
- Use markdown and fenced code blocks.
- Keep answers concise unless explanation is required.
      `,
    });

    // Build combined prompt
    const prompt = `
User message:
${latestMessage}

Language: ${language}

Current editor code:
${currentEditorCode || "(empty)"}
    `;

    // Create streaming API call
    const result = await model.generateContentStream(prompt);

    // Create a ReadableStream to send text chunks to the client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();

            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
        } catch (err) {
          console.error("Stream Error:", err);
          controller.enqueue(
            new TextEncoder().encode("❌ Streaming error occurred.")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response("AI Error: " + error.message, { status: 500 });
  }
}
