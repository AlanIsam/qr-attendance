import { z } from "zod"

// Server-side validation mirrors (and enforces) the client-side rules so they
// cannot be bypassed by calling the API directly.

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  studentId: z.string().trim().max(50).optional().nullable(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required").max(100),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(100),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .max(100, "Password is too long"),
})

export const createAdminSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
})

/** Returns the first validation error message, or null if valid. */
export function firstError(
  result: { success: true } | { success: false; error: z.ZodError }
): string | null {
  if (result.success) return null
  return result.error.issues[0]?.message ?? "Invalid input"
}
