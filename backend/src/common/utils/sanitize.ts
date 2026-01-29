const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeString(value: string): string {
  return value.replace(CONTROL_CHARS, '').trim();
}
