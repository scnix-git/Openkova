export function createSession(): string {
  return crypto.randomUUID();
}
