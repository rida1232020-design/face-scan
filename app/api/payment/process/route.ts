import { type NextRequest, NextResponse } from "next/server"
import { createTransaction, updateUserBalance, getUserBalance } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { amount, description, consultationId } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Check if user has sufficient balance
    const currentBalance = await getUserBalance()
    if (currentBalance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Deduct amount from balance
    await updateUserBalance(-amount)

    // Create transaction record
    const transaction = await createTransaction("payment", amount, description, consultationId)

    const newBalance = await getUserBalance()

    return NextResponse.json({
      success: true,
      transaction,
      newBalance,
    })
  } catch (error) {
    console.error("[v0] Payment processing error:", error)
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 })
  }
}
