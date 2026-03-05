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
  init: (config: { version: string; sandbox?: boolean }) => void
  authenticate: (
    scopes: string[],
    onPresented: () => void
  ) => Promise<PiAuthResult>
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

/** Check if running inside Pi Browser */
export function isPiBrowser(): boolean {
  if (typeof window === "undefined") return false
  return typeof window.Pi !== "undefined"
}

/** Check if Pi sandbox mode */
export function isPiSandbox(): boolean {
  return process.env.NEXT_PUBLIC_PI_SANDBOX === "true"
}

/** Initialize Pi SDK */
export function initPiSDK(): void {
  if (!isPiBrowser()) return
  try {
    window.Pi.init({
      version: "2.0",
      sandbox: isPiSandbox(),
    })
  } catch (e) {
    console.warn("Pi SDK init failed:", e)
  }
}

/** Authenticate user with Pi Network */
export async function authenticatePiUser(): Promise<PiUser | null> {
  if (!isPiBrowser()) {
    // Return mock user for development outside Pi Browser
    const mockUser: PiUser = {
      uid: "dev_user_" + (localStorage.getItem("medipi_dev_uid") || (() => {
        const uid = Math.random().toString(36).substring(2, 10)
        localStorage.setItem("medipi_dev_uid", uid)
        return uid
      })()),
      username: "developer",
      accessToken: "dev_token",
    }
    _piUser = mockUser
    return mockUser
  }

  try {
    const result = await window.Pi.authenticate(
      ["username", "payments"],
      () => { /* dialog presented */ }
    )

    const piUser: PiUser = {
      uid: result.user.uid,
      username: result.user.username,
      accessToken: result.accessToken,
    }

    // Verify with backend
    try {
      const response = await fetch("/api/auth/pi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: piUser.uid,
          username: piUser.username,
          accessToken: piUser.accessToken,
        }),
      })
      if (!response.ok) throw new Error("Server auth failed")
    } catch (e) {
      console.warn("Backend auth verification failed, continuing with Pi auth:", e)
    }

    _piUser = piUser
    return piUser
  } catch (error) {
    console.error("Pi authentication failed:", error)
    return null
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
  return new Promise((resolve) => {
    if (!isPiBrowser()) {
      // Simulate payment in development mode
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: `sim_pay_${Date.now()}`,
          txid: `sim_tx_${Date.now()}`,
        })
      }, 2000)
      return
    }

    window.Pi.createPayment(
      { amount, memo, metadata },
      {
        onReadyForServerApproval: async (paymentId: string) => {
          try {
            // Approve payment on server
            await fetch("/api/payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId }),
            })
          } catch (e) {
            console.error("Payment approval failed:", e)
          }
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          try {
            // Get current user for piUid
            const user = getCurrentPiUser();
            
            // Complete payment on server
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
            resolve({ success: true, paymentId, txid }) // Still resolve as Pi processed it
          }
        },
        onCancel: (paymentId: string) => {
          resolve({ success: false, paymentId, error: "cancelled" })
        },
        onError: (error: Error) => {
          resolve({ success: false, error: error.message })
        },
      }
    )
  })
}
