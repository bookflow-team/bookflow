import { describe, expect, test } from '@jest/globals';
import { clientIp } from '../src/http/client-ip';

const server = { requestIP: () => ({ address: '10.0.0.7' }) };

function request(forwarded?: string) {
  return new Request('http://localhost/', { headers: forwarded ? { 'x-forwarded-for': forwarded } : {} });
}

describe('client address', () => {
  test('uses the address of the connection and ignores X-Forwarded-For when no proxy is trusted', () => {
    expect(clientIp(request('203.0.113.9'), server, false)).toBe('10.0.0.7');
  });

  test('behind a trusted proxy it uses the last entry, the one the proxy added itself', () => {
    expect(clientIp(request('6.6.6.6, 203.0.113.9'), server, true)).toBe('203.0.113.9');
    expect(clientIp(request('203.0.113.9'), server, true)).toBe('203.0.113.9');
  });

  test('a trusted proxy without the header falls back to the connection', () => {
    expect(clientIp(request(), server, true)).toBe('10.0.0.7');
    expect(clientIp(request(' '), server, true)).toBe('10.0.0.7');
  });

  test('without any address it is "unknown", so everybody shares one bucket instead of none', () => {
    expect(clientIp(request(), null, false)).toBe('unknown');
    expect(clientIp(request(), { requestIP: () => null }, false)).toBe('unknown');
  });
});
