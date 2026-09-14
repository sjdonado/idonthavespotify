import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'bun:test';

import { generateTotp } from '~/adapters/spotify';

const referenceTotp = (serverTime: number, secret: string): string => {
  const secretArray = Array.from(secret, c => c.charCodeAt(0));
  const transformed = secretArray.map((element, index) => element ^ ((index % 33) + 9));
  const secretBytes = Buffer.from(transformed.join(''), 'utf8');
  const counter = Math.floor(serverTime / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmacResult = createHmac('sha1', secretBytes).update(counterBuffer).digest();
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);
  return (code % 10 ** 6).toString().padStart(6, '0');
};

describe('Spotify WebCrypto TOTP', () => {
  it('matches the node:crypto reference vectors', async () => {
    const cases: Array<[number, string]> = [
      [1_700_000_000, 'cafef00dsecret'],
      [1_700_000_029, 'cafef00dsecret'],
      [1_700_000_030, 'cafef00dsecret'],
      [1_757_000_000, 'a-longer-secret-value-0123456789'],
      [0, 'x'],
    ];
    for (const [serverTime, secret] of cases) {
      await expect(generateTotp(serverTime, secret)).resolves.toBe(
        referenceTotp(serverTime, secret)
      );
    }
  });

  it('is a zero-padded 6-digit code', async () => {
    const code = await generateTotp(1_700_000_000, 's');
    expect(code).toMatch(/^\d{6}$/);
  });
});
