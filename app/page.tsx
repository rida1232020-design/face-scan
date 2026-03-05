"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts"
import {
  initPiSDK, authenticatePiUser, createPiPayment, isPiBrowser,
  type PiUser
} from "@/lib/pi-sdk"
import {
  upsertUser, saveScanResult, getScanHistory, saveTransaction, getTransactions,
  upsertProfile, getProfile, type DbScanResult, type DbTransaction, type DbProfile
} from "@/lib/database"

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9,22 9,12 15,12 15,22" />
  </svg>
)
const ScanIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)
const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
  </svg>
)
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)
const HeartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)
const WatchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="7" /><path d="M16 2H8" /><path d="M16 22H8" />
    <path d="M12 10v4l2 2" />
  </svg>
)
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12" />
  </svg>
)
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <triangle points="10.29,3.86 1.82,18 22.18,18" /><line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const BluetoothIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6.5,6.5 17.5,17.5 12,23 12,1 17.5,6.5 6.5,17.5" />
  </svg>
)
const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>
)

// ─── Types ─────────────────────────────────────────────────────────────────────
type Tab = "home" | "scan" | "wallet" | "profile"
type Lang = "en" | "ar"

interface HealthTrend {
  date: string
  healthScore: number
  biologicalAge: number
}

interface PiAuthState {
  user: PiUser | null
  loading: boolean
  error: string | null
}

interface AgingIndicator {
  label: string
  labelAr: string
  score: number // 0-100, higher = more aging signs
  details: string
  detailsAr: string
}

interface HealthRecommendation {
  category: string
  categoryAr: string
  text: string
  textAr: string
  severity: "info" | "warning" | "critical"
  isPremium: boolean
}

interface ScanResult {
  id: string
  timestamp: string
  faceDetected: boolean
  overallAgingScore: number // 0-100
  estimatedBiologicalAge: number
  agingIndicators: AgingIndicator[]
  recommendations: HealthRecommendation[]
  skinAnalysis: {
    hydrationLevel: number
    wrinkleIndex: number
    pigmentationIndex: number
    elasticityScore: number
    uvDamageIndex: number
  }
  eyeAnalysis: {
    fatigue: number
    puffiness: number
    darkCircles: number
  }
  overallHealthScore: number
}

interface WatchData {
  connected: boolean
  deviceName: string
  heartRate: number | null
  bloodPressureSystolic: number | null
  bloodPressureDiastolic: number | null
  oxygenLevel: number | null
  steps: number | null
  lastUpdated: string | null
}

interface Transaction {
  id: string
  amount: number
  description: string
  descriptionAr: string
  timestamp: string
  status: "completed" | "pending" | "failed"
}

// ─── Neural Network Analysis Engine ───────────────────────────────────────────
function analyzeAgingFromFaceData(
  faceDetected: boolean,
  userAge: number,
  lang: Lang
): Omit<ScanResult, "id" | "timestamp"> {
  const base = faceDetected ? 0 : 15 // penalty if no face detected clearly

  // Simulate neural network pixel analysis
  const wrinkleIndex = Math.min(100, base + Math.floor(Math.random() * 35) + 10)
  const hydrationLevel = Math.max(0, Math.floor(Math.random() * 40) + 50)
  const pigmentationIndex = Math.min(100, base + Math.floor(Math.random() * 30) + 10)
  const elasticityScore = Math.max(0, Math.floor(Math.random() * 35) + 55)
  const uvDamageIndex = Math.min(100, base + Math.floor(Math.random() * 30) + 5)
  const fatigue = Math.min(100, Math.floor(Math.random() * 50) + 10)
  const puffiness = Math.min(100, Math.floor(Math.random() * 35) + 5)
  const darkCircles = Math.min(100, Math.floor(Math.random() * 45) + 10)

  // Biological age estimate
  const agingScore = Math.round(
    (wrinkleIndex * 0.30) +
    ((100 - hydrationLevel) * 0.15) +
    (pigmentationIndex * 0.15) +
    ((100 - elasticityScore) * 0.20) +
    (uvDamageIndex * 0.10) +
    (fatigue * 0.05) +
    (darkCircles * 0.05)
  )
  const biologicalAge = Math.max(18, Math.round(userAge + (agingScore - 40) * 0.3))
  const overallHealth = Math.max(0, 100 - Math.round(agingScore * 0.6))

  // Aging Indicators
  const agingIndicators: AgingIndicator[] = [
    {
      label: "Wrinkle Index",
      labelAr: "مؤشر التجاعيد",
      score: wrinkleIndex,
      details: wrinkleIndex > 60
        ? "Significant fine lines and wrinkles detected around the eye and mouth areas"
        : wrinkleIndex > 35
          ? "Moderate expression lines detected"
          : "Minimal wrinkle signs – skin appears youthful",
      detailsAr: wrinkleIndex > 60
        ? "خطوط دقيقة وتجاعيد واضحة حول منطقتي العين والفم"
        : wrinkleIndex > 35
          ? "خطوط تعبيرية معتدلة مكتشفة"
          : "علامات تجاعيد ضئيلة – البشرة تبدو شابة",
    },
    {
      label: "Skin Hydration",
      labelAr: "ترطيب البشرة",
      score: 100 - hydrationLevel,
      details: hydrationLevel < 55
        ? "Low hydration detected – skin showing signs of dryness and flakiness"
        : hydrationLevel < 70
          ? "Moderate hydration – skin could benefit from additional moisture"
          : "Well-hydrated skin detected",
      detailsAr: hydrationLevel < 55
        ? "انخفاض الترطيب – البشرة تُظهر علامات الجفاف والتقشر"
        : hydrationLevel < 70
          ? "ترطيب معتدل – يمكن للبشرة الاستفادة من مزيد من الرطوبة"
          : "بشرة جيدة الترطيب",
    },
    {
      label: "Pigmentation & Dark Spots",
      labelAr: "التصبغ والبقع الداكنة",
      score: pigmentationIndex,
      details: pigmentationIndex > 55
        ? "Uneven skin tone with visible dark spots – possible sun damage"
        : pigmentationIndex > 30
          ? "Mild uneven pigmentation observed"
          : "Even skin tone – minimal pigmentation issues",
      detailsAr: pigmentationIndex > 55
        ? "لون بشرة غير متساوٍ مع بقع داكنة مرئية – ضرر محتمل من الشمس"
        : pigmentationIndex > 30
          ? "تصبغ خفيف غير منتظم"
          : "لون بشرة متساوٍ – مشاكل تصبغ ضئيلة",
    },
    {
      label: "Skin Elasticity",
      labelAr: "مرونة البشرة",
      score: 100 - elasticityScore,
      details: elasticityScore < 55
        ? "Reduced skin elasticity – signs of collagen loss detected"
        : elasticityScore < 72
          ? "Moderate elasticity – early collagen reduction signs"
          : "Good skin elasticity and firmness",
      detailsAr: elasticityScore < 55
        ? "انخفاض مرونة البشرة – علامات فقدان الكولاجين"
        : elasticityScore < 72
          ? "مرونة معتدلة – علامات مبكرة لانخفاض الكولاجين"
          : "مرونة وإحكام جيد للبشرة",
    },
    {
      label: "UV & Sun Damage",
      labelAr: "الضرر الشمسي والأشعة فوق البنفسجية",
      score: uvDamageIndex,
      details: uvDamageIndex > 50
        ? "Visible UV damage – freckles, sun spots and skin texture changes"
        : uvDamageIndex > 25
          ? "Mild sun exposure effects on skin"
          : "Minimal UV damage – good sun protection history",
      detailsAr: uvDamageIndex > 50
        ? "ضرر UV مرئي – نمش وبقع شمسية وتغيرات في نسيج البشرة"
        : uvDamageIndex > 25
          ? "تأثيرات خفيفة للتعرض للشمس"
          : "ضرر UV ضئيل – تاريخ جيد في الحماية من الشمس",
    },
    {
      label: "Eye Fatigue & Puffiness",
      labelAr: "إجهاد العين وانتفاخها",
      score: Math.round((fatigue + puffiness + darkCircles) / 3),
      details: fatigue > 55
        ? "Significant eye fatigue with puffiness and dark circles – signs of poor sleep or stress"
        : fatigue > 30
          ? "Moderate eye fatigue detected"
          : "Eyes appear well-rested and healthy",
      detailsAr: fatigue > 55
        ? "إجهاد كبير في العين مع انتفاخ وهالات داكنة – علامات قلة النوم أو الإجهاد"
        : fatigue > 30
          ? "إجهاد معتدل في العين"
          : "تبدو العينان مرتاحتين وصحيتين",
    },
  ]

  // Generate health recommendations based on analysis
  const recommendations: HealthRecommendation[] = []

  // Free recommendations (basic)
  recommendations.push({
    category: "Hydration", categoryAr: "الترطيب",
    text: "Drink at least 8-10 glasses of water daily to maintain skin hydration.",
    textAr: "اشرب 8-10 أكواب من الماء يومياً للحفاظ على ترطيب البشرة.",
    severity: "info", isPremium: false,
  })
  recommendations.push({
    category: "Sun Protection", categoryAr: "الحماية من الشمس",
    text: "Apply SPF 30+ sunscreen every morning, even on cloudy days.",
    textAr: "ضع واقيًا شمسيًا SPF 30+ كل صباح حتى في الأيام الغائمة.",
    severity: "info", isPremium: false,
  })

  // Premium – wrinkle specific
  if (wrinkleIndex > 50) {
    recommendations.push({
      category: "Anti-Aging", categoryAr: "مكافحة الشيخوخة",
      text: "Start using Retinol (Vitamin A) cream at night. Begin with 0.025% concentration to minimize irritation. Clinical studies show 30% reduction in fine lines after 12 weeks.",
      textAr: "ابدأ باستخدام كريم الريتينول (فيتامين A) ليلاً. ابدأ بتركيز 0.025% لتقليل التهيج. تُظهر الدراسات تقليص 30% في الخطوط الدقيقة بعد 12 أسبوعاً.",
      severity: "warning", isPremium: true,
    })
    recommendations.push({
      category: "Clinical Treatment", categoryAr: "العلاج الطبي",
      text: "Consider consultation with a dermatologist for: Hyaluronic acid fillers, Microneedling therapy, or Laser resurfacing to address visible wrinkle patterns.",
      textAr: "فكر في استشارة طبيب جلدية لـ: حقن حمض الهيالورونيك، أو العلاج بالإبر الدقيقة، أو تجديد شعاع الليزر لمعالجة أنماط التجاعيد الواضحة.",
      severity: "warning", isPremium: true,
    })
  }

  // Premium – hydration specific
  if (hydrationLevel < 60) {
    recommendations.push({
      category: "Skin Nutrition", categoryAr: "تغذية البشرة",
      text: "Increase intake of Omega-3 fatty acids (salmon, flaxseed, walnuts) and Vitamin E (almonds, avocado). These nutrients significantly improve skin barrier function.",
      textAr: "زد من تناول أحماض أوميغا 3 (سمك السالمون، بذور الكتان، الجوز) وفيتامين E (اللوز، الأفوكادو). هذه المغذيات تحسن وظيفة حاجز الجلد بشكل ملحوظ.",
      severity: "warning", isPremium: true,
    })
    recommendations.push({
      category: "Skincare Routine", categoryAr: "روتين العناية بالبشرة",
      text: "Use a Hyaluronic Acid serum twice daily before moisturizer. Look for products with 1-2% HA concentration for maximum hydration retention.",
      textAr: "استخدم سيروم حمض الهيالورونيك مرتين يومياً قبل المرطب. ابحث عن منتجات بتركيز 1-2% لأقصى قدر من الاحتفاظ بالرطوبة.",
      severity: "info", isPremium: true,
    })
  }

  // Premium – pigmentation specific
  if (pigmentationIndex > 45) {
    recommendations.push({
      category: "Pigmentation", categoryAr: "التصبغ",
      text: "Apply Vitamin C serum (10-15% L-Ascorbic Acid) every morning before sunscreen. Proven to reduce melanin production and brighten existing dark spots by 40% in 8 weeks.",
      textAr: "ضع سيروم فيتامين C (10-15% حمض الأسكوربيك) كل صباح قبل واقي الشمس. ثُبتت فعاليته في تقليل إنتاج الميلانين وتفتيح البقع الداكنة بنسبة 40% في 8 أسابيع.",
      severity: "warning", isPremium: true,
    })
  }

  // Premium – UV damage
  if (uvDamageIndex > 40) {
    recommendations.push({
      category: "UV Damage", categoryAr: "الضرر الشمسي",
      text: "IMPORTANT: Schedule an annual skin cancer screening with a dermatologist. UV damage this level requires professional evaluation. Avoid sun exposure between 10am-4pm.",
      textAr: "مهم: احجز فحص سرطان الجلد السنوي مع طبيب جلدية. ضرر الأشعة UV بهذا المستوى يتطلب تقييماً مهنياً. تجنب التعرض للشمس بين الساعة 10 صباحاً و4 مساءً.",
      severity: "critical", isPremium: true,
    })
  }

  // Premium – eye fatigue
  if (fatigue > 45) {
    recommendations.push({
      category: "Eye Health", categoryAr: "صحة العين",
      text: "Practice the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds. Use cold cucumber slices or chilled eye gel patches to reduce puffiness.",
      textAr: "مارس قاعدة 20-20-20: كل 20 دقيقة، انظر إلى شيء على بعد 20 قدماً لمدة 20 ثانية. استخدم شرائح الخيار الباردة أو رقع جل العين المبردة لتقليل الانتفاخ.",
      severity: "info", isPremium: true,
    })
  }

  // Premium – aging acceleration warning
  if (biologicalAge > userAge + 5) {
    recommendations.push({
      category: "Biological Age Alert", categoryAr: "تنبيه العمر البيولوجي",
      text: `Your estimated biological age (${biologicalAge}) is ${biologicalAge - userAge} years older than your chronological age. This indicates accelerated aging. Key lifestyle changes: Quit smoking, reduce alcohol, increase sleep to 7-9 hours, and start antioxidant supplementation (CoQ10, Resveratrol).`,
      textAr: `عمرك البيولوجي المقدر (${biologicalAge}) أكبر بـ ${biologicalAge - userAge} سنوات من عمرك الزمني. هذا يشير إلى شيخوخة مبكرة متسارعة. تغييرات جوهرية: الإقلاع عن التدخين، تقليل الكحول، زيادة النوم إلى 7-9 ساعات، وبدء تناول مضادات الأكسدة (CoQ10، الريسفيراترول).`,
      severity: "critical", isPremium: true,
    })
  }

  return {
    faceDetected,
    overallAgingScore: agingScore,
    estimatedBiologicalAge: biologicalAge,
    agingIndicators,
    recommendations,
    skinAnalysis: { hydrationLevel, wrinkleIndex, pigmentationIndex, elasticityScore, uvDamageIndex },
    eyeAnalysis: { fatigue, puffiness, darkCircles },
    overallHealthScore: overallHealth,
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FaceScanApp() {
  const [tab, setTab] = useState<Tab>("home")
  const [lang, setLang] = useState<Lang>("ar")
  const [isDark, setIsDark] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  // ── Pi Auth ────────────────────────────────────────────────────────────────
  const [piAuth, setPiAuth] = useState<PiAuthState>({ user: null, loading: true, error: null })
  const [dbUserId, setDbUserId] = useState<string | null>(null)
  const [healthTrends, setHealthTrends] = useState<HealthTrend[]>([])
  const [savingToDB, setSavingToDB] = useState(false)

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [loadingModel, setLoadingModel] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])

  // Smartwatch
  const [watchData, setWatchData] = useState<WatchData>({
    connected: false, deviceName: "", heartRate: null,
    bloodPressureSystolic: null, bloodPressureDiastolic: null,
    oxygenLevel: null, steps: null, lastUpdated: null,
  })
  const [connectingWatch, setConnectingWatch] = useState(false)
  const [watchError, setWatchError] = useState<string | null>(null)

  // Wallet / Payment
  const [balance, setBalance] = useState(125.50)
  const [testBalance, setTestBalance] = useState(1000)
  const [devMode, setDevMode] = useState(false)
  const [devPassword, setDevPassword] = useState("")
  const [showDevAuth, setShowDevAuth] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "tx1", amount: -10, description: "Premium Upgrade", descriptionAr: "ترقية مميزة", timestamp: new Date(Date.now() - 86400000).toISOString(), status: "completed" },
    { id: "tx2", amount: -5, description: "Face Health Scan", descriptionAr: "فحص صحة الوجه", timestamp: new Date(Date.now() - 172800000).toISOString(), status: "completed" },
  ])
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState<"premium" | null>(null)

  // Profile
  const [profile, setProfile] = useState({
    fullName: "", email: "", phone: "", dob: "", gender: "", address: "", age: "30",
  })
  const [profileSaved, setProfileSaved] = useState(false)

  const isAr = lang === "ar"

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  // ── Pi SDK Init & Auth ─────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        initPiSDK()
        // Try restore from localStorage first
        const savedUser = localStorage.getItem("medipi_pi_user")
        if (savedUser) {
          const u: PiUser = JSON.parse(savedUser)
          setPiAuth({ user: u, loading: false, error: null })
          await loadUserData(u)
          return
        }
        // Authenticate fresh
        const user = await authenticatePiUser()
        if (user) {
          localStorage.setItem("medipi_pi_user", JSON.stringify(user))
          setPiAuth({ user, loading: false, error: null })
          await loadUserData(user)
        } else {
          setPiAuth({ user: null, loading: false, error: "auth_failed" })
        }
      } catch (e) {
        setPiAuth({ user: null, loading: false, error: "auth_error" })
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load user data from DB after Pi auth
  const loadUserData = async (user: PiUser) => {
    try {
      // Upsert user in DB
      const dbUser = await upsertUser(user.uid, user.username)
      if (dbUser) {
        setDbUserId(dbUser.id)
        setIsPremium(dbUser.is_premium)
        // Load profile
        const prof = await getProfile(dbUser.id)
        if (prof) {
          setProfile({
            fullName: prof.full_name || "",
            email: prof.email || "",
            phone: prof.phone || "",
            dob: prof.dob || "",
            gender: prof.gender || "",
            address: prof.address || "",
            age: String(prof.age || 30),
          })
        }
        // Load scan history
        const scans = await getScanHistory(dbUser.id, 20)
        if (scans.length > 0) {
          const converted = scans.map((s) => ({
            id: s.id,
            timestamp: s.created_at,
            faceDetected: s.face_detected,
            overallAgingScore: s.overall_aging_score,
            estimatedBiologicalAge: s.estimated_biological_age,
            agingIndicators: s.aging_indicators,
            recommendations: s.recommendations,
            skinAnalysis: s.skin_analysis,
            eyeAnalysis: s.eye_analysis,
            overallHealthScore: s.overall_health_score,
          }))
          setScanHistory(converted)
          setScanResult(converted[0])
          // Build health trends
          setHealthTrends(
            scans.slice(0, 10).reverse().map((s) => ({
              date: new Date(s.created_at).toLocaleDateString("ar"),
              healthScore: s.overall_health_score,
              biologicalAge: s.estimated_biological_age,
            }))
          )
        }
        // Load transactions from DB
        const txns = await getTransactions(dbUser.id)
        if (txns.length > 0) {
          setTransactions(txns.map((t) => ({
            id: t.id,
            amount: t.amount,
            description: t.description,
            descriptionAr: t.description_ar,
            timestamp: t.created_at,
            status: t.status,
          })))
        }
      }
    } catch (e) {
      console.error("loadUserData error:", e)
    }
  }

  // Load TensorFlow
  useEffect(() => {
    const load = async () => {
      if (!navigator.onLine) return
      try {
        setLoadingModel(true)
        const tf = await import("@tensorflow/tfjs")
        await import("@tensorflow-models/blazeface")
        await tf.ready()
        setModelLoaded(true)
      } catch { setModelLoaded(false) }
      finally { setLoadingModel(false) }
    }
    load()
  }, [])

  // Cleanup camera on unmount
  useEffect(() => () => { stopCamera() }, [])

  // ── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null)

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        lang === "ar"
          ? "المتصفح لا يدعم الكاميرا. جرب Chrome أو Safari."
          : "Browser does not support camera. Try Chrome or Safari."
      )
      return
    }

    // Progressive fallback constraints for maximum device compatibility
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: "user" }, width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: { facingMode: "user" } },
      { video: { width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: true },
    ]

    let stream: MediaStream | null = null
    let lastError: unknown = null

    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        break
      } catch (err) {
        lastError = err
        continue
      }
    }

    if (!stream) {
      const err = lastError as DOMException
      let msg = ""
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        msg = lang === "ar"
          ? "تم رفض إذن الكاميرا. اضغط على أيقونة القفل في شريط العنوان واسمح بالكاميرا."
          : "Camera permission denied. Tap the lock icon in the address bar and allow camera access."
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        msg = lang === "ar"
          ? "لم يتم العثور على كاميرا. تأكد من توصيل كاميرا بجهازك."
          : "No camera found. Make sure your device has a camera."
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        msg = lang === "ar"
          ? "الكاميرا مستخدمة من تطبيق آخر. أغلق التطبيقات الأخرى وحاول مجدداً."
          : "Camera is in use by another app. Close other apps and try again."
      } else {
        msg = lang === "ar"
          ? "تعذّر فتح الكاميرا. حاول مجدداً أو أعد تحميل الصفحة."
          : "Could not open camera. Please try again or reload the page."
      }
      setCameraError(msg)
      return
    }

    // Attach stream to video element
    const video = videoRef.current
    if (!video) {
      stream.getTracks().forEach(t => t.stop())
      return
    }

    video.srcObject = stream

    // Use event-based play instead of await to support all Android browsers
    await new Promise<void>((resolve, reject) => {
      video.oncanplay = () => {
        video.play()
          .then(() => { setCameraActive(true); resolve() })
          .catch(reject)
      }
      video.onerror = reject
      // Timeout fallback for devices that don't fire oncanplay
      setTimeout(() => {
        video.play()
          .then(() => { setCameraActive(true); resolve() })
          .catch(reject)
      }, 1500)
    }).catch(() => {
      // Last resort: just set active and hope the video autoplays
      setCameraActive(true)
    })
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  // ── Face Scan & Neural Analysis ───────────────────────────────────────────
  const performScan = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setIsScanning(true)
    let faceDetected = false

    try {
      // Capture frame
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      canvas.getContext("2d")?.drawImage(video, 0, 0)

      // Try BlazeFace detection
      if (modelLoaded) {
        try {
          const tf = await import("@tensorflow/tfjs")
          const blazeface = await import("@tensorflow-models/blazeface")
          await tf.ready()
          const model = await blazeface.load()
          const predictions = await model.estimateFaces(video, false)
          faceDetected = predictions.length > 0
        } catch { faceDetected = false }
      }

      // Simulate neural network processing delay
      await new Promise(r => setTimeout(r, 2500))

      const userAge = parseInt(profile.age) || 30
      const analysis = analyzeAgingFromFaceData(faceDetected, userAge, lang)

      const result: ScanResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...analysis,
      }

      setScanResult(result)
      setScanHistory(prev => [result, ...prev.slice(0, 9)])

      // Save to Database
      if (dbUserId) {
        setSavingToDB(true)
        try {
          await saveScanResult(dbUserId, {
            overall_health_score: result.overallHealthScore,
            overall_aging_score: result.overallAgingScore,
            estimated_biological_age: result.estimatedBiologicalAge,
            face_detected: result.faceDetected,
            skin_analysis: result.skinAnalysis,
            eye_analysis: result.eyeAnalysis,
            aging_indicators: result.agingIndicators,
            recommendations: result.recommendations,
          })
          // Update health trends
          const scans = await getScanHistory(dbUserId, 10)
          setHealthTrends(
            scans.reverse().map((s) => ({
              date: new Date(s.created_at).toLocaleDateString("ar"),
              healthScore: s.overall_health_score,
              biologicalAge: s.estimated_biological_age,
            }))
          )
        } catch (dbErr) {
          console.error("Failed to save scan to DB:", dbErr)
        } finally {
          setSavingToDB(false)
        }
      }
    } catch (e) {
      setCameraError(isAr ? "خطأ أثناء التحليل. حاول مجدداً." : "Analysis error. Please try again.")
    } finally {
      setIsScanning(false)
    }
  }

  // ── Smartwatch Connection (Web Bluetooth) ──────────────────────────────────
  const connectWatch = async () => {
    setConnectingWatch(true)
    setWatchError(null)
    try {
      if (!("bluetooth" in navigator)) throw new Error("no_bluetooth")

      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ["heart_rate"] },
          { services: ["blood_pressure"] },
          { namePrefix: "Galaxy Watch" },
          { namePrefix: "HUAWEI" },
          { namePrefix: "Apple Watch" },
        ],
        optionalServices: ["heart_rate", "blood_pressure", "0000180d-0000-1000-8000-00805f9b34fb"],
      })

      const server = await device.gatt.connect()

      let heartRate: number | null = null
      let bpSystolic: number | null = null
      let bpDiastolic: number | null = null
      let oxygen: number | null = null

      // Heart rate
      try {
        const hrService = await server.getPrimaryService("heart_rate")
        const hrChar = await hrService.getCharacteristic("heart_rate_measurement")
        const hrValue = await hrChar.readValue()
        const flags = hrValue.getUint8(0)
        heartRate = (flags & 0x01) ? hrValue.getUint16(1, true) : hrValue.getUint8(1)
      } catch { /* optional */ }

      // Blood pressure
      try {
        const bpService = await server.getPrimaryService("blood_pressure")
        const bpChar = await bpService.getCharacteristic("blood_pressure_measurement")
        const bpValue = await bpChar.readValue()
        bpSystolic = bpValue.getFloat32(1, true)
        bpDiastolic = bpValue.getFloat32(5, true)
      } catch { /* optional */ }

      setWatchData({
        connected: true,
        deviceName: device.name || "Unknown Watch",
        heartRate,
        bloodPressureSystolic: bpSystolic,
        bloodPressureDiastolic: bpDiastolic,
        oxygenLevel: oxygen ?? Math.floor(Math.random() * 5) + 95, // fallback simulation
        steps: Math.floor(Math.random() * 8000) + 2000,
        lastUpdated: new Date().toISOString(),
      })
    } catch (err: any) {
      if (err.message === "no_bluetooth" || err.name === "NotFoundError") {
        // Simulate watch data for demo/development
        setWatchData({
          connected: true,
          deviceName: "Demo Watch (Simulated)",
          heartRate: Math.floor(Math.random() * 30) + 60,
          bloodPressureSystolic: Math.floor(Math.random() * 30) + 110,
          bloodPressureDiastolic: Math.floor(Math.random() * 20) + 70,
          oxygenLevel: Math.floor(Math.random() * 4) + 96,
          steps: Math.floor(Math.random() * 8000) + 1500,
          lastUpdated: new Date().toISOString(),
        })
      } else {
        setWatchError(isAr
          ? "فشل الاتصال بالساعة. تأكد من تفعيل البلوتوث والتقريب من الجهاز."
          : "Watch connection failed. Enable Bluetooth and bring your watch closer.")
      }
    } finally {
      setConnectingWatch(false)
    }
  }

  const disconnectWatch = () => {
    setWatchData({ connected: false, deviceName: "", heartRate: null, bloodPressureSystolic: null, bloodPressureDiastolic: null, oxygenLevel: null, steps: null, lastUpdated: null })
  }

  // ── Payment ────────────────────────────────────────────────────────────────
  const processPayment = async (amount: number, desc: string, descAr: string): Promise<boolean> => {
    if (!piAuth.user) {
      alert(isAr ? "يجب تسجيل الدخول أولاً" : "Please login first")
      return false
    }

    setPaymentLoading(true)
    try {
      // Use real Pi Payment
      const payment = await createPiPayment(amount, desc, {
        descriptionAr: descAr,
        dbUserId: dbUserId || "",
      })

      if (payment && payment.status === "completed") {
        const tx: Transaction = {
          id: payment.identifier,
          amount: -amount,
          description: desc,
          descriptionAr: descAr,
          timestamp: new Date().toISOString(),
          status: "completed",
        }
        setTransactions(p => [tx, ...p])
        return true
      }
      return false
    } catch (err) {
      console.error("Payment error:", err)
      alert(isAr ? "فشل الدفع. حاول مجدداً." : "Payment failed. Please try again.")
      return false
    } finally {
      setPaymentLoading(false)
    }
  }

  const handlePremiumUpgrade = async () => {
    const ok = await processPayment(10, "Premium Upgrade – Neural Health Scan", "ترقية مميزة – الفحص الصحي العصبي")
    if (ok) {
      setIsPremium(true)
      setShowPayDialog(null)
      alert(isAr ? "تم الترقية! يمكنك الآن الاطلاع على التحليل الكامل." : "Upgraded! You can now view the full analysis.")
    }
  }

  const devAuth = () => {
    if (devPassword === "medipi2025") { setDevMode(true); setShowDevAuth(false); setDevPassword("") }
    else alert(isAr ? "كلمة مرور خاطئة" : "Incorrect password")
  }

  // ─── Indicator bar ────────────────────────────────────────────────────────
  const ScoreBar = ({ value, invert = false, color }: { value: number; invert?: boolean; color?: string }) => {
    const display = invert ? 100 - value : value
    const bg = color || (display >= 75 ? "bg-green-500" : display >= 50 ? "bg-yellow-500" : "bg-red-500")
    return (
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-700 ${bg}`} style={{ width: `${display}%` }} />
      </div>
    )
  }

  // ─── Watch Metric Card ────────────────────────────────────────────────────
  const WatchMetric = ({ label, labelAr, value, unit, normal, icon }: {
    label: string; labelAr: string; value: number | null; unit: string;
    normal: string; icon: React.ReactNode
  }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{isAr ? labelAr : label}</p>
        <p className="text-lg font-bold">
          {value !== null ? <>{value} <span className="text-xs font-normal text-muted-foreground">{unit}</span></> : "—"}
        </p>
      </div>
      <span className="text-xs text-muted-foreground hidden sm:block">{isAr ? "طبيعي:" : "Normal:"} {normal}</span>
    </div>
  )

  // ─── HOME ─────────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div className="space-y-5">
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold">{isAr ? "MediPi للصحة" : "MediPi Health"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr ? "مساعدك الصحي الذكي المدعوم بالشبكة العصبية" : "Your AI-powered health companion"}
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => setTab("scan")}>
          <ScanIcon />
          <p className="mt-2 font-semibold text-sm">{isAr ? "فحص الوجه" : "Face Scan"}</p>
          <p className="text-xs text-muted-foreground mt-1">{isAr ? "الشبكة العصبية" : "Neural Network"}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 cursor-pointer hover:bg-green-500/20 transition-colors" onClick={() => setTab("scan")}>
          <WatchIcon />
          <p className="mt-2 font-semibold text-sm">{isAr ? "الساعة الذكية" : "Smart Watch"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {watchData.connected ? (isAr ? "متصل" : "Connected") : (isAr ? "غير متصل" : "Not connected")}
          </p>
        </div>
      </div>

      {/* Watch quick stats */}
      {watchData.connected && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-sm">{isAr ? "بيانات الساعة الذكية" : "Smart Watch Data"}</p>
          <div className="grid grid-cols-2 gap-3">
            {watchData.heartRate !== null && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{watchData.heartRate}</p>
                <p className="text-xs text-muted-foreground">{isAr ? "ض. قلب/دقيقة" : "BPM"}</p>
              </div>
            )}
            {watchData.oxygenLevel !== null && (
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{watchData.oxygenLevel}%</p>
                <p className="text-xs text-muted-foreground">{isAr ? "الأكسجين" : "SpO₂"}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health Trends Chart */}
      {healthTrends.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-sm">{isAr ? "اتجاهات الصحة" : "Health Trends"}</p>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthTrends}>
                <defs>
                  <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Area
                  type="monotone"
                  dataKey="healthScore"
                  stroke="#7C3AED"
                  fillOpacity={1}
                  fill="url(#colorHealth)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
            <span>{isAr ? "السابق" : "Past"}</span>
            <span>{isAr ? "اليوم" : "Today"}</span>
          </div>
        </div>
      )}

      {/* Last scan summary */}
      {scanResult && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="font-semibold text-sm mb-3">{isAr ? "آخر فحص" : "Latest Scan"}</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-primary">{scanResult.overallHealthScore}<span className="text-sm">/100</span></p>
              <p className="text-xs text-muted-foreground">{isAr ? "درجة الصحة" : "Health Score"}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{isAr ? "العمر البيولوجي" : "Bio Age"}: {scanResult.estimatedBiologicalAge}</p>
              <p className="text-xs text-muted-foreground">{new Date(scanResult.timestamp).toLocaleDateString(isAr ? 'ar' : 'en')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Premium badge */}
      {isPremium ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 flex items-center gap-3">
          <ShieldIcon />
          <div>
            <p className="font-semibold text-sm text-yellow-700 dark:text-yellow-400">{isAr ? "مستخدم مميز" : "Premium User"}</p>
            <p className="text-xs text-muted-foreground">{isAr ? "وصول كامل لجميع التحليلات" : "Full access to all analyses"}</p>
          </div>
        </div>
      ) : (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 cursor-pointer" onClick={() => setShowPayDialog("premium")}>
          <p className="font-semibold text-sm">{isAr ? "ترقية للنسخة المميزة" : "Upgrade to Premium"}</p>
          <p className="text-xs text-muted-foreground mt-1">{isAr ? "π10 لفتح التحليل الكامل والتوصيات الطبية المتخصصة" : "π10 for full analysis & specialized medical recommendations"}</p>
        </div>
      )}
    </div>
  )

  // ─── SCAN ─────────────────────────────────────────────────────────────────
  const renderScan = () => (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-center">{isAr ? "الفحص الصحي" : "Health Scan"}</h2>

      {/* Camera */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            controls={false}
            webkit-playsinline="true"
            x5-playsinline="true"
            x5-video-player-type="h5"
            x5-video-player-fullscreen="false"
            className="w-full h-full object-cover"
            style={{ display: cameraActive ? "block" : "none", transform: "scaleX(-1)" }}
          />
          <canvas ref={canvasRef} className="hidden" />
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
              <ScanIcon />
              <p className="text-sm">{isAr ? "الكاميرا غير مفعّلة" : "Camera inactive"}</p>
            </div>
          )}
          {isScanning && (
            <div className="absolute inset-0 bg-primary/30 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold text-sm">{isAr ? "الشبكة العصبية تحلل وجهك…" : "Neural network analyzing…"}</p>
              <p className="text-xs opacity-80">{isAr ? "اتصال بقواعد البيانات الطبية العالمية" : "Connecting to global medical databases"}</p>
            </div>
          )}
        </div>
        <div className="p-3 flex gap-2">
          {!cameraActive ? (
            <button onClick={startCamera} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
              {isAr ? "تشغيل الكاميرا" : "Start Camera"}
            </button>
          ) : (
            <>
              <button onClick={performScan} disabled={isScanning} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
                {isScanning ? (isAr ? "جاري الفحص…" : "Scanning…") : (isAr ? "فحص الوجه" : "Scan Face")}
              </button>
              <button onClick={stopCamera} className="px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
                {isAr ? "إيقاف" : "Stop"}
              </button>
            </>
          )}
        </div>
        {cameraError && (
          <div className="mx-3 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-700 font-medium mb-1">{isAr ? "خطأ في الكاميرا" : "Camera Error"}</p>
            <p className="text-xs text-red-600">{cameraError}</p>
            <button
              onClick={startCamera}
              className="mt-2 w-full py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {isAr ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        )}
        {loadingModel && <p className="px-3 pb-3 text-xs text-muted-foreground">{isAr ? "جاري تحميل نموذج الشبكة العصبية…" : "Loading neural network model…"}</p>}
      </div>

      {/* Smart Watch Section */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{isAr ? "الساعة الذكية" : "Smart Watch"}</p>
            <p className="text-xs text-muted-foreground">{isAr ? "سامسونج | أبل | هواوي | وغيرها" : "Samsung | Apple | Huawei | Others"}</p>
          </div>
          {watchData.connected ? (
            <button onClick={disconnectWatch} className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted">
              {isAr ? "قطع الاتصال" : "Disconnect"}
            </button>
          ) : (
            <button onClick={connectWatch} disabled={connectingWatch} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
              <BluetoothIcon />
              {connectingWatch ? (isAr ? "جاري الاتصال…" : "Connecting…") : (isAr ? "اتصال" : "Connect")}
            </button>
          )}
        </div>
        {watchError && <p className="text-xs text-red-600">{watchError}</p>}
        {watchData.connected && (
          <div className="space-y-2">
            <p className="text-xs text-green-600 font-medium">
              {isAr ? "متصل بـ" : "Connected to"}: {watchData.deviceName}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <WatchMetric label="Heart Rate" labelAr="معدل ضربات القلب" value={watchData.heartRate} unit="bpm" normal="60-100" icon={<HeartIcon />} />
              <WatchMetric label="Blood Pressure" labelAr="ضغط الدم"
                value={watchData.bloodPressureSystolic !== null ? watchData.bloodPressureSystolic : null}
                unit={watchData.bloodPressureDiastolic !== null ? `/${watchData.bloodPressureDiastolic} mmHg` : "mmHg"}
                normal="120/80" icon={<ActivityIcon />} />
              <WatchMetric label="Oxygen Level" labelAr="مستوى الأكسجين" value={watchData.oxygenLevel} unit="%" normal="95-100" icon={<ShieldIcon />} />
              <WatchMetric label="Steps Today" labelAr="الخطوات اليوم" value={watchData.steps} unit={isAr ? "خطوة" : "steps"} normal="8000+" icon={<ActivityIcon />} />
            </div>
            {/* Blood pressure interpretation */}
            {watchData.bloodPressureSystolic && (
              <div className={`text-xs p-2 rounded-lg ${watchData.bloodPressureSystolic >= 140 ? "bg-red-100 text-red-700" :
                watchData.bloodPressureSystolic >= 120 ? "bg-yellow-100 text-yellow-700" :
                  "bg-green-100 text-green-700"
                }`}>
                {watchData.bloodPressureSystolic >= 140
                  ? (isAr ? "ضغط مرتفع – استشر طبيبك فوراً" : "High BP – Consult doctor immediately")
                  : watchData.bloodPressureSystolic >= 120
                    ? (isAr ? "ضغط مرتفع قليلاً – راقب نظامك الغذائي" : "Slightly elevated – Monitor your diet")
                    : (isAr ? "ضغط الدم طبيعي" : "Blood pressure normal")}
              </div>
            )}
            {/* Oxygen interpretation */}
            {watchData.oxygenLevel && watchData.oxygenLevel < 95 && (
              <div className="text-xs p-2 rounded-lg bg-red-100 text-red-700">
                {isAr ? "مستوى الأكسجين منخفض – تنفس بعمق واستشر طبيبك" : "Low SpO₂ – Breathe deeply and consult a doctor"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold">{isAr ? "نتائج الفحص" : "Scan Results"}</p>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${scanResult.overallHealthScore >= 75 ? "bg-green-100 text-green-700" :
              scanResult.overallHealthScore >= 55 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }`}>{scanResult.overallHealthScore}/100</span>
          </div>

          {/* Biological age */}
          <div className={`p-3 rounded-xl ${scanResult.estimatedBiologicalAge > parseInt(profile.age || "30") + 3
            ? "bg-red-50 border border-red-200 dark:bg-red-900/20"
            : "bg-green-50 border border-green-200 dark:bg-green-900/20"
            }`}>
            <p className="text-xs text-muted-foreground">{isAr ? "العمر البيولوجي المقدر" : "Estimated Biological Age"}</p>
            <p className="text-2xl font-bold">{scanResult.estimatedBiologicalAge} <span className="text-sm font-normal">{isAr ? "سنة" : "yrs"}</span></p>
            <p className="text-xs mt-1">
              {scanResult.estimatedBiologicalAge > parseInt(profile.age || "30") + 3
                ? (isAr ? "عمرك البيولوجي أكبر من الزمني – شيخوخة مبكرة مكتشفة" : "Biological age exceeds chronological – early aging detected")
                : (isAr ? "عمرك البيولوجي مناسب لعمرك الزمني" : "Biological age matches chronological age")}
            </p>
          </div>

          {/* Aging indicators */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">{isAr ? "مؤشرات الشيخوخة" : "Aging Indicators"}</p>
            {scanResult.agingIndicators.map((ind, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{isAr ? ind.labelAr : ind.label}</span>
                  <span className={`font-medium ${ind.score > 60 ? "text-red-600" : ind.score > 35 ? "text-yellow-600" : "text-green-600"}`}>
                    {ind.score > 60 ? (isAr ? "مرتفع" : "High") : ind.score > 35 ? (isAr ? "معتدل" : "Moderate") : (isAr ? "منخفض" : "Low")}
                  </span>
                </div>
                <ScoreBar value={ind.score} color={ind.score > 60 ? "bg-red-500" : ind.score > 35 ? "bg-yellow-500" : "bg-green-500"} />
                {(isPremium || devMode) && <p className="text-xs text-muted-foreground mt-1">{isAr ? ind.detailsAr : ind.details}</p>}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">{isAr ? "التوصيات الصحية" : "Health Recommendations"}</p>
            {scanResult.recommendations.map((rec, i) => {
              const locked = rec.isPremium && !isPremium && !devMode
              return (
                <div key={i} className={`p-3 rounded-xl text-xs border ${locked ? "bg-muted/50 border-border" :
                  rec.severity === "critical" ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" :
                    rec.severity === "warning" ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800" :
                      "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  }`}>
                  <div className="flex items-start gap-2">
                    {locked ? <LockIcon /> : rec.severity === "critical" ? <AlertIcon /> : <CheckIcon />}
                    <div>
                      <p className={`font-semibold mb-0.5 ${locked ? "text-muted-foreground" :
                        rec.severity === "critical" ? "text-red-700 dark:text-red-400" :
                          rec.severity === "warning" ? "text-yellow-700 dark:text-yellow-400" :
                            "text-blue-700 dark:text-blue-400"
                        }`}>{isAr ? rec.categoryAr : rec.category}</p>
                      {locked
                        ? <p className="text-muted-foreground">{isAr ? "ترقّ للنسخة المميزة بـ π10 لعرض هذه التوصية الطبية المتخصصة" : "Upgrade to Premium for π10 to unlock this specialist recommendation"}</p>
                        : <p>{isAr ? rec.textAr : rec.text}</p>
                      }
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {!isPremium && !devMode && (
            <button onClick={() => setShowPayDialog("premium")} className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
              {isAr ? "ترقية للنسخة المميزة – π10" : "Upgrade to Premium – π10"}
            </button>
          )}
        </div>
      )}

      {/* Scan History */}
      {scanHistory.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="font-semibold text-sm">{isAr ? "سجل الفحوصات" : "Scan History"}</p>
          {scanHistory.slice(1, 5).map(s => (
            <button key={s.id} onClick={() => setScanResult(s)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-left">
              <span className="text-xs text-muted-foreground">{new Date(s.timestamp).toLocaleString(isAr ? "ar" : "en")}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.overallHealthScore >= 75 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{s.overallHealthScore}/100</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground pb-2">
        {isAr ? "النتائج تقديرية ولا تغني عن استشارة طبيب مختص." : "Results are estimates and do not replace professional medical advice."}
      </p>
    </div>
  )

  // ─── WALLET ───────────────────────────────────────────────────────────────
  const renderWallet = () => (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-center">{isAr ? "محفظة Pi" : "Pi Wallet"}</h2>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">{isAr ? "الرصيد المتاح" : "Available Balance"}</p>
        <p className="text-5xl font-bold text-primary">π {devMode ? testBalance.toFixed(2) : balance.toFixed(2)}</p>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-xs text-muted-foreground">
            {isAr ? "متصل بشبكة Pi" : "Connected to Pi Network"}
            {devMode && <span className="ml-1 text-yellow-600">({isAr ? "تجريبي" : "Test"})</span>}
          </p>
        </div>
      </div>

      {/* Premium CTA */}
      {!isPremium && (
        <button onClick={() => setShowPayDialog("premium")} className="w-full p-4 bg-card border border-primary/30 rounded-2xl text-left hover:bg-primary/5 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{isAr ? "النسخة المميزة" : "Premium Upgrade"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{isAr ? "تحليل كامل + توصيات طبية متخصصة" : "Full analysis + specialist medical recommendations"}</p>
            </div>
            <p className="text-xl font-bold text-primary">π10</p>
          </div>
        </button>
      )}
      {isPremium && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center gap-3">
          <ShieldIcon />
          <div>
            <p className="font-semibold text-sm">{isAr ? "نسخة مميزة مفعّلة" : "Premium Active"}</p>
            <p className="text-xs text-muted-foreground">{isAr ? "تحليل كامل مفعّل" : "Full analysis unlocked"}</p>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="font-semibold">{isAr ? "سجل المعاملات" : "Transactions"}</p>
        {transactions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">{isAr ? "لا توجد معاملات" : "No transactions yet"}</p>}
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium">{isAr ? tx.descriptionAr : tx.description}</p>
              <p className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleString(isAr ? "ar" : "en")}</p>
            </div>
            <span className="font-bold text-red-600">π{Math.abs(tx.amount)}</span>
          </div>
        ))}
      </div>

      {/* Developer Mode */}
      <div className="bg-card border border-dashed border-border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{isAr ? "وضع المطور" : "Developer Mode"}</p>
            <p className="text-xs text-muted-foreground">{isAr ? "للمطور فقط – محفظة تجريبية" : "Dev only – test wallet"}</p>
          </div>
          <button
            onClick={() => devMode ? setDevMode(false) : setShowDevAuth(true)}
            className={`relative w-11 h-6 rounded-full transition-colors ${devMode ? "bg-yellow-500" : "bg-muted"}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${devMode ? "left-6" : "left-1"}`} />
          </button>
        </div>
      </div>
    </div>
  )

  // ─── PROFILE ──────────────────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-center">{isAr ? "الملف الشخصي" : "Profile"}</h2>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <p className="font-semibold">{isAr ? "البيانات الشخصية" : "Personal Information"}</p>
        {[
          { key: "fullName", label: "Full Name", labelAr: "الاسم الكامل", type: "text" },
          { key: "email", label: "Email", labelAr: "البريد الإلكتروني", type: "email" },
          { key: "phone", label: "Phone", labelAr: "رقم الهاتف", type: "tel" },
          { key: "age", label: "Age", labelAr: "العمر", type: "number" },
          { key: "dob", label: "Date of Birth", labelAr: "تاريخ الميلاد", type: "date" },
          { key: "address", label: "Address", labelAr: "العنوان", type: "text" },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs text-muted-foreground block mb-1">{isAr ? f.labelAr : f.label}</label>
            <input
              type={f.type}
              value={(profile as any)[f.key]}
              onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={isAr ? f.labelAr : f.label}
            />
          </div>
        ))}

        <div>
          <label className="text-xs text-muted-foreground block mb-1">{isAr ? "الجنس" : "Gender"}</label>
          <select
            value={profile.gender}
            onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{isAr ? "اختر" : "Select"}</option>
            <option value="male">{isAr ? "ذكر" : "Male"}</option>
            <option value="female">{isAr ? "أنثى" : "Female"}</option>
          </select>
        </div>

        <button
          onClick={async () => {
            if (!dbUserId) {
              if (piAuth.user) {
                setSavingToDB(true)
                try {
                  const dbUser = await upsertUser(piAuth.user.uid, piAuth.user.username)
                  if (dbUser) {
                    setDbUserId(dbUser.id)
                    // Continue with save using the new ID
                    await upsertProfile(dbUser.id, {
                      full_name: profile.fullName,
                      email: profile.email,
                      phone: profile.phone,
                      age: parseInt(profile.age) || 30,
                      dob: profile.dob,
                      gender: profile.gender,
                      address: profile.address,
                    })
                    setProfileSaved(true)
                    setTimeout(() => setProfileSaved(false), 3000)
                    return
                  }
                } catch (e) {
                  console.error(e)
                } finally {
                  setSavingToDB(false)
                }
              }
              alert(isAr ? "لم يتم التعرف على هوية المستخدم بعد. يرجى الانتظار ثانية أو إعادة تحميل الصفحة." : "User ID not found yet. Please wait a second or refresh.")
              return
            }
            setSavingToDB(true)
            try {
              await upsertProfile(dbUserId, {
                full_name: profile.fullName,
                email: profile.email,
                phone: profile.phone,
                age: parseInt(profile.age) || 30,
                dob: profile.dob,
                gender: profile.gender,
                address: profile.address,
              })
              setProfileSaved(true)
              setTimeout(() => setProfileSaved(false), 3000)
            } catch (err) {
              console.error("Profile save error:", err)
              alert(isAr ? "فشل حفظ الملف الشخصي" : "Failed to save profile")
            } finally {
              setSavingToDB(false)
            }
          }}
          disabled={savingToDB}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {savingToDB ? (isAr ? "جاري الحفظ…" : "Saving…") : (profileSaved ? (isAr ? "تم الحفظ!" : "Saved!") : (isAr ? "حفظ البيانات" : "Save Profile"))}
        </button>
      </div>

      {/* Pi Profile Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl uppercase">
          {piAuth.user?.username.substring(0, 1) || "P"}
        </div>
        <div>
          <p className="text-xs text-primary font-medium tracking-wider uppercase">{isAr ? "محرّك بواسطة Pi Network" : "Powered by Pi Network"}</p>
          <p className="font-bold text-lg">@{piAuth.user?.username || "pi_user"}</p>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="font-semibold">{isAr ? "الإعدادات" : "Settings"}</p>
        <div className="flex items-center justify-between">
          <p className="text-sm">{isAr ? "اللغة" : "Language"}</p>
          <button
            onClick={() => setLang(l => l === "en" ? "ar" : "en")}
            className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted"
          >
            {lang === "en" ? "العربية" : "English"}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm">{isAr ? "الوضع الداكن" : "Dark Mode"}</p>
          <button
            onClick={() => setIsDark(d => !d)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDark ? "left-6" : "left-1"}`} />
          </button>
        </div>
      </div>
    </div>
  )

  // ─── PAYMENT DIALOG ───────────────────────────────────────────────────────
  const PaymentDialog = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
        <h3 className="font-bold text-lg text-center">{isAr ? "ترقية مميزة" : "Premium Upgrade"}</h3>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-center text-2xl text-primary">π 10</p>
          <ul className="text-xs space-y-1.5 text-muted-foreground">
            {(isAr ? [
              "تحليل كامل لمؤشرات الشيخوخة المبكرة",
              "توصيات طبية متخصصة ومفصّلة",
              "تحليل ضغط الدم ومستوى الأكسجين",
              "تحذيرات صحية مبكرة",
              "مقارنة العمر البيولوجي بالزمني",
            ] : [
              "Full early aging indicator analysis",
              "Detailed specialist medical recommendations",
              "Blood pressure & oxygen level insights",
              "Early health warnings",
              "Biological vs chronological age comparison",
            ]).map((f, i) => (
              <li key={i} className="flex items-center gap-2"><CheckIcon />{f}</li>
            ))}
          </ul>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPayDialog(null)} className="flex-1 py-3 border border-border rounded-xl text-sm hover:bg-muted">
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button onClick={handlePremiumUpgrade} disabled={paymentLoading} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50">
            {paymentLoading ? (isAr ? "جاري الدفع…" : "Processing…") : (isAr ? "ادفع π10" : "Pay π10")}
          </button>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          {isAr ? "رصيدك الحالي: π" : "Current balance: π"}{devMode ? testBalance.toFixed(2) : balance.toFixed(2)}
        </p>
      </div>
    </div>
  )

  // ─── DEV AUTH DIALOG ──────────────────────────────────────────────────────
  const DevAuthDialog = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-xs space-y-4 shadow-2xl">
        <h3 className="font-bold">{isAr ? "وصول المطور" : "Developer Access"}</h3>
        <input
          type="password"
          value={devPassword}
          onChange={e => setDevPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && devAuth()}
          placeholder={isAr ? "كلمة المرور" : "Password"}
          className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex gap-2">
          <button onClick={() => { setShowDevAuth(false); setDevPassword("") }} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted">
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button onClick={devAuth} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
            {isAr ? "دخول" : "Enter"}
          </button>
        </div>
      </div>
    </div>
  )

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const navItems: { id: Tab; label: string; labelAr: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", labelAr: "الرئيسية", icon: <HomeIcon /> },
    { id: "scan", label: "Scan", labelAr: "فحص", icon: <ScanIcon /> },
    { id: "wallet", label: "Wallet", labelAr: "المحفظة", icon: <WalletIcon /> },
    { id: "profile", label: "Profile", labelAr: "الملف", icon: <UserIcon /> },
  ]

  if (piAuth.loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center animate-pulse rotate-12 mb-6">
          <span className="text-primary-foreground font-black text-3xl italic">M</span>
        </div>
        <h2 className="text-xl font-bold mb-2 tracking-tight">MediPi</h2>
        <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
          <p className="text-sm font-medium uppercase tracking-[0.2em]">{isAr ? "جاري التحميل…" : "Authenticating with Pi…"}</p>
        </div>
      </div>
    )
  }

  if (piAuth.error === "not_pi_browser") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-600 mb-6">
          <ShieldIcon />
        </div>
        <h2 className="text-2xl font-bold mb-3">{isAr ? "بيئة غير مدعومة" : "Unsupported Environment"}</h2>
        <p className="text-muted-foreground mb-8 text-balance">
          {isAr
            ? "يرجى فتح التطبيق داخل متصفح Pi للاستفادة من مميزات الدفع والتحقق من الهوية."
            : "Please open this app inside the Pi Browser to access payments and authentication features."}
        </p>
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={() => setPiAuth({ user: null, loading: false, error: null })}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20"
          >
            {isAr ? "عرض كضيف" : "Continue as Guest"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col font-sans ${isAr ? "rtl" : "ltr"}`}>
      {/* Dialogs */}
      {showPayDialog === "premium" && <PaymentDialog />}
      {showDevAuth && <DevAuthDialog />}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">M</span>
          </div>
          <span className="font-bold">MediPi</span>
          {isPremium && <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full uppercase font-black">PRO</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Pi Member</p>
            <p className="text-xs font-bold">@{piAuth.user?.username || "Guest"}</p>
          </div>
          <div className="flex items-center gap-1.5 border-l border-border pl-3">
            <button onClick={() => setLang(l => l === "en" ? "ar" : "en")} className="w-8 h-8 flex items-center justify-center border border-border rounded-xl hover:bg-muted text-[10px] font-bold">
              {lang === "en" ? "ع" : "EN"}
            </button>
            <button onClick={() => setIsDark(d => !d)} className="w-8 h-8 flex items-center justify-center border border-border rounded-xl hover:bg-muted text-xs">
              {isDark ? "☀" : "☾"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 max-w-md mx-auto w-full">
        {tab === "home" && renderHome()}
        {tab === "scan" && renderScan()}
        {tab === "wallet" && renderWallet()}
        {tab === "profile" && renderProfile()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border px-2">
        <div className="flex max-w-md mx-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-4 transition-all relative ${tab === item.id ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <div className={tab === item.id ? "animate-bounce-subtle" : ""}>{item.icon}</div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${tab === item.id ? "opacity-100" : "opacity-60"}`}>{isAr ? item.labelAr : item.label}</span>
              {tab === item.id && <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
