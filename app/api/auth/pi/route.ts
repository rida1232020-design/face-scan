import { NextRequest, NextResponse } from "next/server"
import { upsertUser } from "@/lib/database"

type PiMeResponse = {
    uid?: unknown
    username?: unknown
    user?: {
        uid?: unknown
        username?: unknown
    }
}

function getVerifiedPiIdentity(me: PiMeResponse): { uid: string; username: string } | null {
    const uid = typeof me.uid === "string" ? me.uid : typeof me.user?.uid === "string" ? me.user.uid : null
    const username =
        typeof me.username === "string"
            ? me.username
            : typeof me.user?.username === "string"
                ? me.user.username
                : null

    return uid && username ? { uid, username } : null
}

function createSessionCookieValue(uid: string, username: string): string {
    return Buffer.from(
        JSON.stringify({
            uid,
            username,
            authenticatedAt: new Date().toISOString(),
        }),
        "utf8"
    ).toString("base64url")
}

/**
 * POST /api/auth/pi
 * Verifies Pi Network access token and upserts user in database
 */
export async function POST(request: NextRequest) {
    try {
        const { accessToken } = await request.json()

        if (typeof accessToken !== "string" || accessToken.length === 0) {
            return NextResponse.json(
                { error: "Missing Pi access token" },
                { status: 400 }
            )
        }

        const verifyResponse = await fetch("https://api.minepi.com/v2/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
        })

        if (!verifyResponse.ok) {
            return NextResponse.json(
                { error: "Invalid Pi access token" },
                { status: 401 }
            )
        }

        const identity = getVerifiedPiIdentity((await verifyResponse.json()) as PiMeResponse)
        if (!identity) {
            return NextResponse.json(
                { error: "Pi token validation response did not include a user" },
                { status: 502 }
            )
        }

        const user = await upsertUser(identity.uid, identity.username)

        const response = NextResponse.json({
            success: true,
            user: {
                id: user?.id,
                pi_uid: identity.uid,
                username: identity.username,
                is_premium: user?.is_premium || false,
                pi_balance: user?.pi_balance || 0,
            },
        })

        response.cookies.set({
            name: "facescan_pi_session",
            value: createSessionCookieValue(identity.uid, identity.username),
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        })

        return response
    } catch (error: any) {
        console.error("Pi auth error detail:", {
            message: error.message,
            stack: error.stack,
        })

        if (error instanceof TypeError) {
            return NextResponse.json(
                { error: "Could not verify Pi token" },
                { status: 503 }
            )
        }

        return NextResponse.json(
            { error: "Internal server error: " + error.message },
            { status: 500 }
        )
    }
}
