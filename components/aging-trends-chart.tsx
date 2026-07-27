"use client"

import React from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"

export interface ScanResultForChart {
  id: string
  timestamp: string
  overallHealthScore: number
  overallAgingScore: number
  estimatedBiologicalAge: number
  skinAnalysis?: {
    hydrationLevel: number
    wrinkleIndex: number
    pigmentationIndex: number
    elasticityScore: number
    uvDamageIndex: number
  }
}

interface AgingTrendsChartProps {
  scans: ScanResultForChart[]
  userAge?: number
  isAr?: boolean
}

export function AgingTrendsChart({
  scans,
  userAge = 30,
  isAr = true,
}: AgingTrendsChartProps) {
  if (!scans || scans.length === 0) {
    return (
      <div className="p-6 bg-card border border-border rounded-2xl text-center text-muted-foreground text-sm">
        {isAr
          ? "قم بإجراء أول فحص ضوئي لبدء تتبع مؤشرات العمر البيولوجي والصحة!"
          : "Take your first scan to start tracking biological age & health trends!"}
      </div>
    )
  }

  // Sort scans chronologically (oldest to newest)
  const sortedScans = [...scans].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const chartData = sortedScans.map((scan, idx) => {
    const dateObj = new Date(scan.timestamp)
    const dateStr = dateObj.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
    })

    return {
      name: dateStr || `#${idx + 1}`,
      biologicalAge: scan.estimatedBiologicalAge,
      chronologicalAge: userAge,
      healthScore: scan.overallHealthScore,
      agingScore: scan.overallAgingScore,
      hydration: scan.skinAnalysis?.hydrationLevel ?? 70,
      wrinkles: scan.skinAnalysis?.wrinkleIndex ?? 20,
    }
  })

  // Calculate trends
  const latest = sortedScans[sortedScans.length - 1]
  const first = sortedScans[0]
  const ageDiff = latest.estimatedBiologicalAge - userAge
  const healthDiff = latest.overallHealthScore - (first.overallHealthScore || 0)

  return (
    <div className="space-y-4 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-sm">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div>
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            {isAr ? "مسار العمر البيولوجي والصحة" : "Biological Age & Health Trends"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAr
              ? `بناءً على ${scans.length} فحص(ات) سابقة`
              : `Based on ${scans.length} previous scan(s)`}
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground font-medium">
              {isAr ? "العمر البيولوجي الحالي" : "Current Bio Age"}
            </p>
            <p className="text-sm font-bold text-primary">
              {latest.estimatedBiologicalAge} {isAr ? "سنة" : "yrs"}
            </p>
          </div>

          <div
            className={`rounded-xl px-3 py-1.5 border text-center ${
              ageDiff <= 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
            }`}
          >
            <p className="text-[10px] text-muted-foreground font-medium">
              {isAr ? "مقارنة بالعمر الحقيقي" : "vs Actual Age"}
            </p>
            <p className="text-sm font-bold">
              {ageDiff > 0 ? `+${ageDiff}` : ageDiff}{" "}
              {isAr ? "سنة" : "yrs"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Biological Age Chart */}
      <div className="pt-2">
        <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-between">
          <span>{isAr ? "مخطط العمر البيولوجي مقابل العمر الفعلي" : "Bio Age vs Chronological Age"}</span>
          <span className="text-[10px] bg-muted px-2 py-0.5 rounded-md">
            {isAr ? "العمر الأصغر = صحة أفضل" : "Younger = Better Health"}
          </span>
        </p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(20, 20, 30, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "#fff",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line
                type="monotone"
                dataKey="biologicalAge"
                name={isAr ? "العمر البيولوجي التقديري" : "Estimated Bio Age"}
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 4, fill: "#8b5cf6" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="chronologicalAge"
                name={isAr ? "العمر الحقيقي" : "Chronological Age"}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Health Score & Hydration Trend */}
      {scans.length >= 2 && (
        <div className="pt-4 border-t border-border/40">
          <p className="text-xs font-semibold text-muted-foreground mb-3">
            {isAr ? "تطور نضارة البشرة ومؤشر الصحة العامة" : "Skin Vitality & Health Score Trend"}
          </p>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(20, 20, 30, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
                <Line
                  type="monotone"
                  dataKey="healthScore"
                  name={isAr ? "نقاط الصحة العامة" : "Health Score"}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="hydration"
                  name={isAr ? "مستوى ترطيب البشرة" : "Hydration Level"}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
