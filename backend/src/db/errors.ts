export function isUniqueViolation(error: unknown): boolean {
  return (error as { cause?: { code?: string } } | null)?.cause?.code === '23505';
}
