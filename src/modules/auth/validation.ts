export type ValidationResult = { valid: true } | { valid: false; error: string };

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) return { valid: false, error: "Email is required." };
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) {
    return { valid: false, error: "Enter a valid email address." };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: "Password is required." };
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters." };
  }
  return { valid: true };
}

export function validateDisplayName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "Display name is required." };
  if (trimmed.length > 60) {
    return { valid: false, error: "Display name must be 60 characters or fewer." };
  }
  return { valid: true };
}
//*newly added*
/**
 * Guards against open redirects. Only allows same-origin, path-relative
 * targets — rejects protocol-relative ("//evil.com"), absolute URLs
 * ("https://evil.com"), and backslash tricks ("/\evil.com").
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.startsWith("/\\")) return false;
  if (path.includes("://")) return false;
  return true;
}