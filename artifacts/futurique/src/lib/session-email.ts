const KEY = 'futurique-session-email';
export const FALLBACK_EMAIL = 'temp@gmail.com';
export const EMAIL_RE = /^(?=.{1,254}$)[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/;
export function getSessionEmail(): string {
  try { return window.sessionStorage.getItem(KEY) || FALLBACK_EMAIL; } catch { return FALLBACK_EMAIL; }
}
export function setSessionEmail(email: string) {
  try { window.sessionStorage.setItem(KEY, email); } catch { /* storage unavailable */ }
}
export function clearSessionEmail() {
  try { window.sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
