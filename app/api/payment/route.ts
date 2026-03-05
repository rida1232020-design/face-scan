import { NextRequest, NextResponse } from "next/server"
import { saveTransaction } from "@/lib/database"

const PI_API_KEY = process.env.PI_API_KEY || ""
const PI_SANDBOX = process.env.NEXT_PUBLIC_PI_SANDBOX === "true"
const PI_BASE_URL = PI_SANDBOX
    ? "https://api.minepi.com/v2"
    : "https://api.minepi.com/v2"

/**
 * POST /api/payment
 * Approve a Pi payment (called when payment is ready for server approval)
 */
export async function POST(request: NextRequest) {
    try {
        const { paymentId } = await request.json()

        if (!paymentId) {
            return NextResponse.json({ error: "Missing paymentId" }, { status: 400 })
        }

        // In sandbox/development mode, auto-approve
        if (!PI_API_KEY || paymentId.startsWith("sim_")) {
            return NextResponse.json({ success: true, approved: true })
        }

        // Approve with Pi API
        const response = await fetch(
            `${PI_BASE_URL}/payments/${paymentId}/approve`,
            {
                method: "POST",
                headers: {
                    Authorization: `Key ${PI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        )

        if (!response.ok) {
            const error = await response.text()
            console.error("Pi payment approval failed:", error)
            return NextResponse.json(
                { error: "Payment approval failed" },
                { status: 400 }
            )
        }

        return NextResponse.json({ success: true, approved: true })
    } catch (error) {
        console.error("Payment route error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
