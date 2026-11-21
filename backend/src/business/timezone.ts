const IANA_NAME = /^(UTC|[A-Za-z]+(?:[_-][A-Za-z]+)*(?:\/[A-Za-z0-9_+-]+)+)$/;

export function isValidTimeZone(zone: string): boolean {
  if (!IANA_NAME.test(zone)) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
