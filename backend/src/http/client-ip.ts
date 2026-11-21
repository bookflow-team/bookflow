type AddressSource = { requestIP(request: Request): { address: string } | null };

export function clientIp(request: Request, server: AddressSource | null, trustProxy: boolean): string {
  if (trustProxy) {
    const last = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
    if (last) return last;
  }
  return server?.requestIP(request)?.address ?? 'unknown';
}
