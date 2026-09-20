import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';

describe('HelperEncryptionService', () => {
    const helperStringService = {
        random: vi.fn<HelperStringService['random']>(),
    } satisfies Pick<HelperStringService, 'random'>;
    const configService = new ConfigService({
        'app.encryptionSecretKey': 'app-secret',
    });
    const iv = '1234567890abcdef';

    let service: HelperEncryptionService;

    beforeEach(() => {
        vi.resetAllMocks();
        helperStringService.random.mockReturnValue(iv);
        service = new HelperEncryptionService(
            configService,
            helperStringService as unknown as HelperStringService
        );
    });

    describe('base64', () => {
        it('round-trips utf8 text', () => {
            const encoded = service.base64Encrypt('caf\u00e9 text');

            expect(encoded).toBe(
                Buffer.from('caf\u00e9 text', 'utf8').toString('base64')
            );
            expect(service.base64Decrypt(encoded)).toBe('caf\u00e9 text');
        });

        it('compares tokens by strict equality', () => {
            expect(service.base64Compare('a', 'a')).toBe(true);
            expect(service.base64Compare('a', 'b')).toBe(false);
        });
    });

    describe('aes256Encrypt / aes256Decrypt', () => {
        it('round-trips a JSON value with a utf8 IV', () => {
            const data = { id: 1, tags: ['a', 'b'] };

            const encrypted = service.aes256Encrypt(data, 'key', iv);

            expect(encrypted).not.toContain('"id"');
            expect(service.aes256Decrypt(encrypted, 'key', iv)).toEqual(data);
        });

        it('accepts hex: and b64: IV prefixes and they decode the same bytes', () => {
            const bytes = Buffer.from('0123456789abcdef', 'utf8');
            const hexIv = `hex:${bytes.toString('hex')}`;
            const b64Iv = `b64:${bytes.toString('base64')}`;

            const viaHex = service.aes256Encrypt('x', 'key', hexIv);
            const viaB64 = service.aes256Encrypt('x', 'key', b64Iv);
            const viaUtf8 = service.aes256Encrypt(
                'x',
                'key',
                '0123456789abcdef'
            );

            expect(viaHex).toBe(viaUtf8);
            expect(viaB64).toBe(viaUtf8);
            expect(service.aes256Decrypt<string>(viaHex, 'key', hexIv)).toBe(
                'x'
            );
        });

        it.each(['', 'hex:', 'b64:'])(
            'rejects the missing IV value %j',
            badIv => {
                expect(() => service.aes256Encrypt('x', 'key', badIv)).toThrow(
                    'missing IV value'
                );
                expect(() =>
                    service.aes256Decrypt('abc', 'key', badIv)
                ).toThrow('missing IV value');
            }
        );

        it('throws when decrypting with the wrong key', () => {
            const encrypted = service.aes256Encrypt({ a: 1 }, 'key', iv);

            expect(() =>
                service.aes256Decrypt(encrypted, 'other-key', iv)
            ).toThrow();
        });

        it('throws when decrypting with the wrong IV', () => {
            const encrypted = service.aes256Encrypt({ a: 1 }, 'key', iv);

            expect(() =>
                service.aes256Decrypt(encrypted, 'key', 'fedcba0987654321')
            ).toThrow();
        });

        it('throws on malformed ciphertext', () => {
            expect(() =>
                service.aes256Decrypt('not-a-ciphertext', 'key', iv)
            ).toThrow();
        });

        it('throws the decryption failure error when the plaintext is empty', () => {
            expect(() => service.aes256Decrypt('', 'key', iv)).toThrow(
                'AES-256-CBC decryption failed'
            );
        });

        it('compares ciphertexts by strict equality', () => {
            expect(service.aes256Compare('a', 'a')).toBe(true);
            expect(service.aes256Compare('a', 'b')).toBe(false);
        });
    });

    describe('aes256EncryptSimple / aes256DecryptSimple', () => {
        it('prefixes the random IV and round-trips', () => {
            const encrypted = service.aes256EncryptSimple('secret');

            expect(helperStringService.random).toHaveBeenCalledWith(16);
            expect(encrypted.startsWith(`${iv}:`)).toBe(true);
            expect(service.aes256DecryptSimple(encrypted)).toBe('secret');
        });

        it('binds the ciphertext to the extended key', () => {
            const encrypted = service.aes256EncryptSimple('secret', 'ctx');

            expect(service.aes256DecryptSimple(encrypted, 'ctx')).toBe(
                'secret'
            );
            expect(() => service.aes256DecryptSimple(encrypted)).toThrow();
            expect(() =>
                service.aes256DecryptSimple(encrypted, 'other')
            ).toThrow();
        });

        it('extended key derives from the app secret joined by a colon', () => {
            const encrypted = service.aes256EncryptSimple('secret', 'ctx');
            const [, body] = encrypted.split(':');

            expect(service.aes256Decrypt(body, 'app-secret:ctx', iv)).toBe(
                'secret'
            );
        });

        it.each(['', 'noBody', ':nobody', 'iv:'])(
            'rejects the malformed payload %j',
            payload => {
                expect(() => service.aes256DecryptSimple(payload)).toThrow(
                    'Invalid encrypted data format'
                );
            }
        );
    });
});
