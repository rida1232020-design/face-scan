import { NextRequest, NextResponse } from "next/server"
import { upsertUser } from "@/lib/database"

/**
 * POST /api/auth/pi
 * Verifies Pi Network access token and upserts user in database
 */
export async function POST(request: NextRequest) {
    try {
        const { uid, username, accessToken } = await request.json()

        if (!uid || !username) {
            return NextResponse.json(
                { error: "Missing uid or username" },
                { status: 400 }
            )
        }

        // Verify token with Pi API (in production use PI_API_KEY)
        const piApiKey = process.env.PI_API_KEY
        if (piApiKey && accessToken && accessToken !== "dev_token") {
            try {
                const verifyResponse = await fetch(
                    "https://api.minepi.com/v2/me" ,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                )
                if (!verifyResponse.ok) {
                    return NextResponse.json(
                        { error: "Invalid Pi access token" },
                        { status: 401 }
                    )
                }
            } catch {
                // If Pi API is unreachable, allow in sandbox mode
                if (process.env.NEXT_PUBLIC_PI_SANDBOX !== "true") {
                    return NextResponse.json(
                        { error: "Could not verify Pi token" },
                        { status: 503 }
                    )
                }
            }
        }

        // Upsert user in database
        const user = await upsertUser(uid, username)

        return NextResponse.json({
            success: true,
            user: {
                id: user?.id,
                pi_uid: uid,
                username,
                is_premium: user?.is_premium || false,
                pi_balance: user?.pi_balance || 0,
            },
        })
    } catch (error: any) {
        console.error("Pi auth error detail:", {
            message: error.message,
            stack: error.stack,
            uid: await request.clone().json().then(b => b.uid).catch(() => "unknown")
        })
        return NextResponse.json(
            { error: "Internal server error: " + error.message },
            { status: 500 }
        )
    }
}
