import { type NextRequest, NextResponse } from "next/server"
import { searchDrugs, getAllDrugs } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    let drugs
    if (query) {
      drugs = await searchDrugs(query)
    } else {
      drugs = await getAllDrugs()
    }

    return NextResponse.json({ drugs })
  } catch (error) {
    console.error("[v0] Drug search error:", error)
    return NextResponse.json({ error: "Failed to search drugs" }, { status: 500 })
  }
}
