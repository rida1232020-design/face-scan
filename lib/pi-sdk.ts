/**
 * Pi Network SDK Integration for MediPi
 * Handles authentication and payments within Pi Browser
 */

declare global {
  interface Window {
    Pi: PiSDK
  }
}

interface PiSDK {
  init: (config: { version: string; sandbox?: boolean }) => Promise<void>
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound?: (payment: unknown) => void | Promise<void>
  ) => Promise<PiAuthResult>
  getPiHostAppInfo?: () => Promise<{ hostApp?: string }>
  createPayment: (
    paymentData: PiPaymentData,
    callbacks: PiPaymentCallbacks
  ) => void
  openShareDialog: (title: string, message: string) => void
}

export interface PiAuthResult {
  accessToken: string
  user: {
    uid: string
    username: string
  }
}

interface PiPaymentData {
  amount: number
  memo: string
  metadata: Record<string, any>
}

interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void
  onReadyForServerCompletion: (paymentId: string, txid: string) => void
  onCancel: (paymentId: string) => void
  onError: (error: Error, payment?: any) => void
}

export interface PiUser {
  uid: string
  username: string
  accessToken: string
}

let _piUser: PiUser | null = null
let _isInitialized = false
let _initPromise: Promise<void> | null = null

/** Check if running inside Pi Browser */
export function isPiBrowser(): boolean {
  if (typeof window === "undefined") return false
  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.includes("pibrowser") || userAgent.includes("pi browser")
}

function hasPiSDK(): boolean {
  return typeof window !== "undefined" && typeof window.Pi?.authenticate === "function"
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs)
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      }
    )
  })
}

/** Helper to wait for Pi SDK to be available on window */
async function waitForPiSDK(timeout = 15000): Promise<boolean> {
  if (typeof window === "undefined") return false
  if ((window as any).Pi) return true

  return new Promise((resolve) => {
    const start = Date.now()
    const check = setInterval(() => {
      if ((window as any).Pi) {
        clearInterval(check)
        resolve(true)
      } else if (Date.now() - start > timeout) {
        clearInterval(check)
        console.warn("Pi SDK weighted timeout reached")
        resolve(false)
      }
    }, 100)
  })
}

/** Check if Pi sandbox mode */
export function isPiSandbox(): boolean {
  return process.env.NEXT_PUBLIC_PI_SANDBOX === "true"
}

/** Initialize Pi SDK */
export async function initPiSDK(): Promise<void> {
  if (_isInitialized) return
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    const ready = await waitForPiSDK()
    if (!ready || !window.Pi) {
      throw new Error("Pi SDK not available. Open this app in Pi Browser.")
    }

    await window.Pi.init({
      version: "2.0",
      sandbox: isPiSandbox(),
    })

    _isInitialized = true
    console.log("Pi SDK Initialized successfully")
  })()

  try {
    await _initPromise
  } catch (error) {
    _initPromise = null
    console.error("Pi SDK init failed:", error)
    throw error
  }
}

export async function isPiHostApp(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (isPiBrowser()) return true

  try {
    await initPiSDK()
  } catch {
    return false
  }

  if (typeof window.Pi.getPiHostAppInfo !== "function") {
    return hasPiSDK()
  }

  try {
    const hostInfo = await withTimeout(
      window.Pi.getPiHostAppInfo(),
      2500,
      "Pi host detection timed out"
    )
    return Boolean(hostInfo?.hostApp)
  } catch {
    return false
  }
}

/** Authenticate user with Pi Network */
export async function authenticatePiUser(): Promise<PiUser | null> {
  await initPiSDK()

  try {
    console.log("Calling Pi.authenticate...")
    const result = await withTimeout(
      window.Pi.authenticate(
        ["username"],
        async (payment: any) => {
          if (payment) {
            console.warn("Incomplete Pi payment found during auth:", payment)
            try {
              if (payment.identifier && payment.transaction?.txid) {
                await fetch("/api/payment/complete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    paymentId: payment.identifier,
                    txid: payment.transaction.txid,
                    memo: payment.memo || "Incomplete Payment Resolved",
                    amount: payment.amount || 0,
                    piUid: payment.user_uid,
                  }),
                })
              }
            } catch (err) {
              console.error("Failed to resolve incomplete payment:", err)
            }
          }
        }
      ),
      45000,
      "Pi authentication timed out. Tap Sign in and approve the request in Pi Browser."
    )

    if (!result.accessToken) {
      throw new Error("Pi authentication did not return an access token")
    }

    const response = await fetch("/api/auth/pi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: result.accessToken }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.error || "Server auth failed")
    }

    const verifiedUser = data?.user
    if (!verifiedUser?.pi_uid || !verifiedUser?.username) {
      throw new Error("Server auth response did not include a verified Pi user")
    }

    const piUser: PiUser = {
      uid: verifiedUser.pi_uid,
      username: verifiedUser.username,
      accessToken: result.accessToken,
    }

    _piUser = piUser
    return piUser
  } catch (error: any) {
    console.error("Pi authentication failed:", error)
    throw error
  }
}

/** Get the currently authenticated Pi user */
export function getCurrentPiUser(): PiUser | null {
  return _piUser
}

/** Set Pi user (e.g., from localStorage restore) */
export function setPiUser(user: PiUser): void {
  _piUser = user
}

/** Create a Pi payment */
export async function createPiPayment(
  amount: number,
  memo: string,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; paymentId?: string; txid?: string; error?: string }> {
  // Ensure initialized first
  if (isPiBrowser() && !_isInitialized) {
    await initPiSDK()
  }

  if (!isPiBrowser()) {
    // Simulate payment in development mode
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: `sim_pay_${Date.now()}`,
          txid: `sim_tx_${Date.now()}`,
        })
      }, 2000)
    })
  }

  // Double check initialization
  if (!_isInitialized || !window.Pi) {
    const ready = await waitForPiSDK()
    if (!ready || !window.Pi) {
      throw new Error("Pi SDK not available for payment")
    }
  }

  return new Promise((resolve) => {
    try {
      console.log("Calling Pi.createPayment with amount:", amount)
      window.Pi.createPayment(
        { amount, memo, metadata },
        {
          onReadyForServerApproval: async (paymentId: string) => {
            try {
              console.log("Approving payment on server:", paymentId)
              const res = await fetch("/api/payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId }),
              })
              if (!res.ok) {
                const text = await res.text()
                console.error("Server payment approval failed:", text)
                // Note: We don't resolve here; the SDK might handle the failure or timeout
              } else {
                console.log("Server payment approval successful")
              }
            } catch (e) {
              console.error("Payment approval fetch failed:", e)
            }
          },
          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            try {
              console.log("Completing payment on server:", paymentId, txid)
              const user = getCurrentPiUser();
              await fetch("/api/payment/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentId,
                  txid,
                  memo,
                  amount,
                  piUid: user?.uid,
                  description: metadata.description || memo,
                  descriptionAr: metadata.descriptionAr || memo
                }),
              })
              resolve({ success: true, paymentId, txid })
            } catch (e) {
              console.error("Payment completion failed:", e)
              resolve({ success: true, paymentId, txid })
            }
          },
          onCancel: (paymentId: string) => {
            console.log("Payment cancelled:", paymentId)
            resolve({ success: false, paymentId, error: "cancelled" })
          },
          onError: (error: Error, payment?: any) => {
            console.error("Pi SDK Payment Error:", error, payment)
            resolve({ success: false, error: error.message || "SDK Error" })
          },
        }
      )
    } catch (e: any) {
      console.error("Pi.createPayment thrown error:", e)
      resolve({ success: false, error: e.message || "Execution Error" })
    }
  })
}

/** Share result via Pi Browser or native Share API */
export function shareOnPiNetwork(title: string, message: string): void {
  if (typeof window !== "undefined" && window.Pi && typeof window.Pi.openShareDialog === "function") {
    window.Pi.openShareDialog(title, message)
  } else if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title, text: message }).catch(() => {})
  } else if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(`${title}\n${message}`).then(() => {
      alert("تم نسخ النتيجة لمشاركتها!")
    }).catch(() => {})
  }
}

