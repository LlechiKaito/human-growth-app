import { beforeEach, describe, expect, it } from 'vitest';

import { LocalAuthProvider } from '@/infrastructure/auth/local-auth.provider';

describe('LocalAuthProvider', () => {
  let provider: LocalAuthProvider;

  beforeEach(() => {
    provider = new LocalAuthProvider('test-secret-key-with-enough-length-1234');
  });

  it('signs up a new user and returns a verifiable token', async () => {
    const { sub, tokens } = await provider.signup({
      email: 'a@example.com',
      password: 'password123',
      displayName: 'A',
    });
    expect(sub).toBeTypeOf('string');
    expect(tokens.idToken).toBeTypeOf('string');

    const claims = await provider.verify(tokens.idToken);
    expect(claims.sub).toBe(sub);
    expect(claims.email).toBe('a@example.com');
  });

  it('rejects duplicate signup', async () => {
    await provider.signup({ email: 'b@example.com', password: 'password123', displayName: 'B' });
    await expect(
      provider.signup({ email: 'b@example.com', password: 'password123', displayName: 'B' }),
    ).rejects.toThrow(/already/);
  });

  it('login succeeds with correct password', async () => {
    await provider.signup({ email: 'c@example.com', password: 'password123', displayName: 'C' });
    const { tokens } = await provider.login({ email: 'c@example.com', password: 'password123' });
    expect(tokens.idToken).toBeTypeOf('string');
  });

  it('login fails with wrong password', async () => {
    await provider.signup({ email: 'd@example.com', password: 'password123', displayName: 'D' });
    await expect(
      provider.login({ email: 'd@example.com', password: 'wrong' }),
    ).rejects.toThrow(/Invalid credentials/);
  });

  it('verify rejects tampered tokens', async () => {
    const { tokens } = await provider.signup({
      email: 'e@example.com',
      password: 'password123',
      displayName: 'E',
    });
    const tampered = tokens.idToken.slice(0, -2) + 'aa';
    await expect(provider.verify(tampered)).rejects.toThrow(/Invalid token/);
  });
});
