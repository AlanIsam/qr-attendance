import { v4 as uuidv4 } from "uuid"

export interface QRTokenPayload {
  token: string
  sessionId: string
  expiresAt: number
}

export function generateQRToken(sessionId: string, ttlSeconds: number = 30): QRTokenPayload {
  return {
    token: uuidv4(),
    sessionId,
    expiresAt: Date.now() + ttlSeconds * 1000,
  }
}

export function encodeQRData(payload: QRTokenPayload): string {
  return JSON.stringify(payload)
}

export function decodeQRData(data: string): QRTokenPayload | null {
  try {
    const parsed = JSON.parse(data)
    if (parsed.token && parsed.sessionId && parsed.expiresAt) {
      return parsed as QRTokenPayload
    }
    return null
  } catch {
    return null
  }
}
