import { NextRequest, NextResponse } from "next/server"
import { upsertProfile, getProfile, getUserByPiUid } from "@/lib/database"

/**
 * GET /api/profile?piUid=xxx
 * Fetch user profile
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const piUid = searchParams.get("piUid")

        if (!piUid) {
            return NextResponse.json({ error: "Missing piUid" }, { status: 400 })
        }

        const user = await getUserByPiUid(piUid)
        if (!user) {
            return NextResponse.json({ profile: null })
        }

        const profile = await getProfile(user.id)
        return NextResponse.json({ profile })
    } catch (error) {
        console.error("Get profile error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

/**
 * POST /api/profile
 * Save/update user profile
 */
export async function POST(request: NextRequest) {
    try {
        const { piUid, profile } = await request.json()

        if (!piUid || !profile) {
            return NextResponse.json({ error: "Missing piUid or profile" }, { status: 400 })
        }

        const user = await getUserByPiUid(piUid)
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const saved = await upsertProfile(user.id, {
            full_name: profile.fullName || "",
            email: profile.email || "",
            phone: profile.phone || "",
            age: parseInt(profile.age) || 30,
            dob: profile.dob || undefined,
            gender: profile.gender || "",
            address: profile.address || "",
        })

        return NextResponse.json({ success: true, profile: saved })
    } catch (error) {
        console.error("Save profile error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
