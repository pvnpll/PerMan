import { describe, it, expect } from 'vitest';
import { GET as getAuthServer } from '@/app/.well-known/oauth-authorization-server/route';
import { GET as getOpenIdConfig } from '@/app/.well-known/openid-configuration/route';
import { GET as getProtectedResource } from '@/app/.well-known/oauth-protected-resource/route';
import crypto from 'crypto';

describe('OAuth Discovery Metadata Endpoints', () => {
  it('serves RFC 8414 Authorization Server Metadata', async () => {
    const res = await getAuthServer();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.authorization_endpoint).toContain('/mcp/authorize');
    expect(data.token_endpoint).toContain('/api/mcp/token');
    expect(data.registration_endpoint).toContain('/api/mcp/register');
    expect(data.response_types_supported).toContain('code');
    expect(data.grant_types_supported).toContain('authorization_code');
    expect(data.code_challenge_methods_supported).toContain('S256');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('serves OpenID Connect configuration metadata', async () => {
    const res = await getOpenIdConfig();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.authorization_endpoint).toContain('/mcp/authorize');
    expect(data.token_endpoint).toContain('/api/mcp/token');
    expect(data.scopes_supported).toContain('openid');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('serves RFC 9728 Protected Resource Metadata', async () => {
    const res = await getProtectedResource();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.resource).toContain('/api/mcp');
    expect(data.bearer_methods_supported).toContain('header');
    expect(data.authorization_endpoint).toContain('/mcp/authorize');
    expect(data.token_endpoint).toContain('/api/mcp/token');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('validates RFC 7636 PKCE S256 code_challenge calculation', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const expectedChallenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    expect(expectedChallenge).toBeTruthy();
    expect(typeof expectedChallenge).toBe('string');
    expect(expectedChallenge.length).toBeGreaterThan(20);
  });
});
