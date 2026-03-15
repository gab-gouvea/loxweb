const TOKEN_KEY = "lox_token"
const USER_NAME_KEY = "lox_user_name"
const SAVED_EMAIL_KEY = "lox_saved_email"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_NAME_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function getUserName(): string {
  return localStorage.getItem(USER_NAME_KEY) ?? ""
}

export function setUserName(name: string): void {
  localStorage.setItem(USER_NAME_KEY, name)
}

export function getSavedEmail(): string {
  return localStorage.getItem(SAVED_EMAIL_KEY) ?? ""
}

export function saveEmail(email: string): void {
  localStorage.setItem(SAVED_EMAIL_KEY, email)
}

export function clearSavedEmail(): void {
  localStorage.removeItem(SAVED_EMAIL_KEY)
}
