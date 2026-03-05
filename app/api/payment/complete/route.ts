import { NextRequest, NextResponse } from "next/server"
import { saveTransaction, updateTransactionStatus, getUserByPiUid } from "@/lib/database"

const PI_API_KEY = process.env.PI_API_KEY || ""
const PI_SANDBOX = process.env.NEXT_PUBLIC_PI_SANDBOX === "true"
const PI_BASE_URL = "https://api.minepi.com/v2"

/**
 * POST /api/payment/complete
 * Complete a Pi payment after blockchain confirmation
 */
export async function POST(request: NextRequest) {
    try {
        const { paymentId, txid, memo, amount, piUid, description, descriptionAr } = await request.json()

        if (!paymentId || !txid) {
            return NextResponse.json({ error: "Missing paymentId or txid" }, { status: 400 })
        }

        // Complete with Pi API (skip for simulated payments)
        if (PI_API_KEY && !paymentId.startsWith("sim_")) {
            const response = await fetch(
                `${PI_BASE_URL}/payments/${paymentId}/complete`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Key ${PI_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ txid }),
                }
            )

            if (!response.ok) {
                const error = await response.text()
                console.error("Pi payment completion failed:", error)
                // Don't fail – log it and continue since Pi already processed it
            }
        }

        // Save/update transaction in database if we have a user ID
        if (piUid) {
            const user = await getUserByPiUid(piUid)
            if (user) {
                await saveTransaction(user.id, {
                    pi_payment_id: paymentId,
                    transaction_type: "payment",
                    amount: -(amount || 0),
                    description: description || memo || "Pi Payment",
                    description_ar: descriptionAr || memo || "دفعة Pi",
                    status: "completed",
                })
            }
        }

        return NextResponse.json({ success: true, completed: true })
    } catch (error) {
        console.error("Payment complete route error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
