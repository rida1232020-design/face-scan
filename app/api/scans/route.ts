import { NextRequest, NextResponse } from "next/server"
import { saveScanResult, getScanHistory, getUserByPiUid } from "@/lib/database"

/**
 * POST /api/scans
 * Save a scan result to the database
 */
export async function POST(request: NextRequest) {
    try {
        const { piUid, scan } = await request.json()

        if (!piUid || !scan) {
            return NextResponse.json({ error: "Missing piUid or scan" }, { status: 400 })
        }

        const user = await getUserByPiUid(piUid)
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const saved = await saveScanResult(user.id, {
            overall_health_score: scan.overallHealthScore,
            overall_aging_score: scan.overallAgingScore,
            estimated_biological_age: scan.estimatedBiologicalAge,
            face_detected: scan.faceDetected,
            skin_analysis: scan.skinAnalysis,
            eye_analysis: scan.eyeAnalysis,
            aging_indicators: scan.agingIndicators,
            recommendations: scan.recommendations,
        })

        return NextResponse.json({ success: true, scan: saved })
    } catch (error) {
        console.error("Save scan error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

/**
 * GET /api/scans?piUid=xxx&limit=20
 * Fetch scan history for a user
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const piUid = searchParams.get("piUid")
        const limit = parseInt(searchParams.get("limit") || "20")

        if (!piUid) {
            return NextResponse.json({ error: "Missing piUid" }, { status: 400 })
        }

        const user = await getUserByPiUid(piUid)
        if (!user) {
            return NextResponse.json({ scans: [] })
        }

        const scans = await getScanHistory(user.id, limit)
        return NextResponse.json({ scans })
    } catch (error) {
        console.error("Get scans error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
