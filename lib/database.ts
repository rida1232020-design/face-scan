/**
 * MediPi Database Layer
 * Uses Supabase when configured, falls back to localStorage for offline use
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface DbUser {
  id: string
  pi_uid: string
  username: string
  email?: string
  is_premium: boolean
  pi_balance: number
  created_at: string
  updated_at: string
}

export interface DbProfile {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string
  age: number
  dob?: string
  gender: string
  address: string
  updated_at: string
}

export interface DbScanResult {
  id: string
  user_id: string
  overall_health_score: number
  overall_aging_score: number
  estimated_biological_age: number
  face_detected: boolean
  skin_analysis: {
    hydrationLevel: number
    wrinkleIndex: number
    pigmentationIndex: number
    elasticityScore: number
    uvDamageIndex: number
  }
  eye_analysis: {
    fatigue: number
    puffiness: number
    darkCircles: number
  }
  aging_indicators: Array<{
    label: string
    labelAr: string
    score: number
    details: string
    detailsAr: string
  }>
  recommendations: Array<{
    category: string
    categoryAr: string
    text: string
    textAr: string
    severity: string
    isPremium: boolean
  }>
  created_at: string
}

export interface DbTransaction {
  id: string
  user_id: string
  pi_payment_id?: string
  transaction_type: "payment" | "refund" | "deposit" | "withdrawal"
  amount: number
  description: string
  description_ar: string
  status: "pending" | "completed" | "failed" | "cancelled"
  created_at: string
}

// Legacy types (kept for backwards compatibility)
export interface Drug {
  id: string
  name: string
  generic_name: string
  description: string
  dosage: string
  side_effects: string[]
  interactions: string[]
  price: number
  manufacturer: string
  category: string
  requires_prescription: boolean
  is_approved: boolean
}

// ──────────────────────────────────────────────────────────────────────────────
// Supabase Client
// ──────────────────────────────────────────────────────────────────────────────

let supabaseClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes("your-project")) {
    return null // Not configured
  }

  supabaseClient = createClient(url, key)
  return supabaseClient
}

function isSupabaseConfigured(): boolean {
  return getSupabase() !== null
}

// ──────────────────────────────────────────────────────────────────────────────
// LocalStorage Fallback Helpers
// ──────────────────────────────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(`medipi_${key}`)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`medipi_${key}`, JSON.stringify(value))
  } catch { }
}

// ──────────────────────────────────────────────────────────────────────────────
// User Functions
// ──────────────────────────────────────────────────────────────────────────────

export async function upsertUser(piUid: string, username: string): Promise<DbUser | null> {
  const db = getSupabase()
  if (db) {
    const { data, error } = await db
      .from("users")
      .upsert(
        { pi_uid: piUid, username },
        { onConflict: "pi_uid", ignoreDuplicates: false }
      )
      .select()
      .single()

    if (error) {
      console.error("upsertUser error:", error)
      return null
    }
    return data as DbUser
  }

  // LocalStorage fallback
  const existing = lsGet<DbUser | null>("user", null)
  if (existing && existing.pi_uid === piUid) return existing
  const user: DbUser = {
    id: `local_${piUid}`,
    pi_uid: piUid,
    username,
    is_premium: false,
    pi_balance: 125.5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  lsSet("user", user)
  return user
}

export async function getUserByPiUid(piUid: string): Promise<DbUser | null> {
  const db = getSupabase()
  if (db) {
    const { data, error } = await db
      .from("users")
      .select("*")
      .eq("pi_uid", piUid)
      .single()
    if (error) return null
    return data as DbUser
  }
  const user = lsGet<DbUser | null>("user", null)
  return user?.pi_uid === piUid ? user : null
}

export async function updateUserPremium(userId: string, isPremium: boolean): Promise<void> {
  const db = getSupabase()
  if (db) {
    await db.from("users").update({ is_premium: isPremium }).eq("id", userId)
    return
  }
  const user = lsGet<DbUser | null>("user", null)
  if (user) lsSet("user", { ...user, is_premium: isPremium })
}

// ──────────────────────────────────────────────────────────────────────────────
// Profile Functions
// ──────────────────────────────────────────────────────────────────────────────

export async function upsertProfile(
  userId: string,
  profile: Partial<Omit<DbProfile, "id" | "user_id" | "updated_at">>
): Promise<DbProfile | null> {
  const db = getSupabase()
  if (db) {
    const { data, error } = await db
      .from("profiles")
      .upsert(
        { user_id: userId, ...profile },
        { onConflict: "user_id" }
      )
      .select()
      .single()
    if (error) {
      console.error("upsertProfile error:", error)
      return null
    }
    return data as DbProfile
  }

  const existing = lsGet<DbProfile | null>("profile", null)
  const updated: DbProfile = {
    id: existing?.id || `local_prof_${Date.now()}`,
    user_id: userId,
    full_name: "",
    email: "",
    phone: "",
    age: 30,
    gender: "",
    address: "",
    updated_at: new Date().toISOString(),
    ...existing,
    ...profile,
  }
  lsSet("profile", updated)
  return updated
}

export async function getProfile(userId: string): Promise<DbProfile | null> {
  const db = getSupabase()
  if (db) {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()
    if (error) return null
    return data as DbProfile
  }
  return lsGet<DbProfile | null>("profile", null)
}

// ──────────────────────────────────────────────────────────────────────────────
// Scan Functions
// ──────────────────────────────────────────────────────────────────────────────

export async function saveScanResult(
  userId: string,
  scan: Omit<DbScanResult, "id" | "user_id" | "created_at">
): Promise<DbScanResult | null> {
  const db = getSupabase()
  if (db) {
    const { data, error } = await db
      .from("scan_results")
      .insert({ user_id: userId, ...scan })
      .select()
      .single()
    if (error) {
      console.error("saveScanResult error:", error)
      return null
    }
    return data as DbScanResult
  }

  // LocalStorage fallback
  const scans = lsGet<DbScanResult[]>("scans", [])
  const newScan: DbScanResult = {
    id: `local_scan_${Date.now()}`,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...scan,
  }
  lsSet("scans", [newScan, ...scans].slice(0, 50))
  return newScan
}

export async function getScanHistory(
  userId: string,
  limit = 20
): Promise<DbScanResult[]> {
  const db = getSupabase()
  if (db) {
    const { data, error } = await db
      .from("scan_results")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) {
      console.error("getScanHistory error:", error)
      return []
    }
    return (data || []) as DbScanResult[]
  }

  const scans = lsGet<DbScanResult[]>("scans", [])
  return scans.filter((s) => s.user_id === userId).slice(0, limit)
}

// ──────────────────────────────────────────────────────────────────────────────
// Transaction Functions
// ──────────────────────────────────────────────────────────────────────────────

export async function saveTransaction(
  userId: string,
  tx: Omit<DbTransaction, "id" | "user_id" | "created_at">
): Promise<DbTransaction | null> {
  const db = getSupabase()
  if (db) {
    const { data, error } = await db
      .from("transactions")
      .insert({ user_id: userId, ...tx })
      .select()
      .single()
    if (error) {
      console.error("saveTransaction error:", error)
      return null
    }
    return data as DbTransaction
  }

  const txns = lsGet<DbTransaction[]>("transactions", [])
  const newTx: DbTransaction = {
    id: `local_tx_${Date.now()}`,
    user_id: userId,
    created_at: new Date().toISOString(),
    ...tx,
  }
  lsSet("transactions", [newTx, ...txns].slice(0, 100))
  return newTx
}

export async function getTransactions(userId: string): Promise<DbTransaction[]> {
  const db = getSupabase()
  if (db) {
    const { data, error } = await db
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) return []
    return (data || []) as DbTransaction[]
  }

  const txns = lsGet<DbTransaction[]>("transactions", [])
  return txns.filter((t) => t.user_id === userId)
}

export async function updateTransactionStatus(
  piPaymentId: string,
  status: "completed" | "failed"
): Promise<void> {
  const db = getSupabase()
  if (db) {
    await db
      .from("transactions")
      .update({ status })
      .eq("pi_payment_id", piPaymentId)
    return
  }
  const txns = lsGet<DbTransaction[]>("transactions", [])
  lsSet(
    "transactions",
    txns.map((t) =>
      t.pi_payment_id === piPaymentId ? { ...t, status } : t
    )
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Legacy Drug Functions (kept for compatibility)
// ──────────────────────────────────────────────────────────────────────────────

const MOCK_DRUGS: Drug[] = [
  {
    id: "1",
    name: "Aspirin",
    generic_name: "Acetylsalicylic Acid",
    description: "Pain reliever and anti-inflammatory medication",
    dosage: "325-650mg every 4-6 hours",
    side_effects: ["Stomach upset", "Bleeding risk", "Allergic reactions"],
    interactions: ["Blood thinners", "NSAIDs"],
    price: 5.99,
    manufacturer: "Bayer",
    category: "NSAID",
    requires_prescription: false,
    is_approved: true,
  },
  {
    id: "2",
    name: "Metformin",
    generic_name: "Metformin Hydrochloride",
    description: "First-line medication for Type 2 diabetes",
    dosage: "500mg twice daily with meals",
    side_effects: ["GI upset", "Lactic acidosis (rare)", "Vitamin B12 deficiency"],
    interactions: ["Alcohol", "Contrast dye"],
    price: 12.99,
    manufacturer: "Bristol-Myers Squibb",
    category: "Antidiabetic",
    requires_prescription: true,
    is_approved: true,
  },
  {
    id: "3",
    name: "Lisinopril",
    generic_name: "Lisinopril",
    description: "ACE inhibitor for hypertension and heart failure",
    dosage: "10-40mg once daily",
    side_effects: ["Dry cough", "Dizziness", "Hyperkalemia"],
    interactions: ["Potassium supplements", "NSAIDs"],
    price: 8.99,
    manufacturer: "Merck",
    category: "ACE Inhibitor",
    requires_prescription: true,
    is_approved: true,
  },
]

export async function searchDrugs(query: string): Promise<Drug[]> {
  return MOCK_DRUGS.filter(
    (d) =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.generic_name.toLowerCase().includes(query.toLowerCase()) ||
      d.category.toLowerCase().includes(query.toLowerCase())
  )
}

export async function getAllDrugs(): Promise<Drug[]> {
  return MOCK_DRUGS
}
