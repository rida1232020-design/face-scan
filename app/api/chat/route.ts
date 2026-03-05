import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, consultationId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Generate AI response using AI SDK
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      system: `You are a helpful medical AI assistant. Provide accurate, helpful medical information while always reminding users to consult healthcare professionals for serious concerns. 
      
      You can answer questions about:
      - General health information
      - Medication information and side effects
      - Symptoms and when to seek medical care
      - Healthy lifestyle advice
      - First aid basics
      
      Always be empathetic, clear, and responsible. Never diagnose serious conditions or prescribe medications.
      Respond in the same language as the user's question (Arabic or English).`,
      prompt: message,
      maxTokens: 500,
      temperature: 0.7,
    })

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
