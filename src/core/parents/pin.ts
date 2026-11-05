/**
 * PIN de la zona de padres (4 dígitos). Se guarda solo un hash SHA-256 con sal, nunca el PIN.
 * Es una barrera para que el niño no cambie los ajustes por accidente, no una medida de seguridad fuerte.
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function newSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function checkPin(pin: string, salt: string | null, hash: string | null): Promise<boolean> {
  if (!salt || !hash || !isValidPin(pin)) return false;
  return (await hashPin(pin, salt)) === hash;
}
