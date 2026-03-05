import { type NextRequest, NextResponse } from "next/server"
import { saveTransaction, getUserByPiUid } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { amount, description, piUid } = await request.json()

    if (!amount || amount <= 0 || !piUid) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    const user = await getUserByPiUid(piUid)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has sufficient balance (using pi_balance from DB)
    if (user.pi_balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Create transaction record
    const transaction = await saveTransaction(user.id, {
      transaction_type: "payment",
      amount: -amount,
      description: description || "In-app payment",
      description_ar: "دفع داخلي",
      status: "completed"
    })

    return NextResponse.json({
      success: true,
      transaction,
      newBalance: user.pi_balance - amount,
    })
  } catch (error: any) {
    console.error("[v0] Payment processing error:", error)
    return NextResponse.json({ error: "Payment processing failed: " + error.message }, { status: 500 })
  }
}
