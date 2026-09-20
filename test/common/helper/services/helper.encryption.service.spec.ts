import { describe, expect, it } from 'vitest';

import { HelperDecryptFailedException } from '@common/helper/exceptions/helper.decrypt-failed.exception';
import { HelperEncryptionSecretInvalidException } from '@common/helper/exceptions/helper.encryption-secret-invalid.exception';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';

describe('HelperEncryptionService', () => {
    const service = new HelperEncryptionService();
    const secret = Buffer.alloc(48, 1).toString('base64url');

    describe('aes256Encrypt / aes256Decrypt', () => {
        it('round-trips text for the same purpose and context', () => {
            const encrypted = service.aes256Encrypt(
                'secret value',
                secret,
                'session',
                'user-id'
            );

            expect(encrypted).not.toContain('secret value');
            expect(encrypted.split('.')).toHaveLength(4);
            expect(
                service.aes256Decrypt(encrypted, secret, 'session', 'user-id')
            ).toBe('secret value');
        });

        it.each([
            [
                'another secret',
                Buffer.alloc(48, 2).toString('base64url'),
                'session',
                'user-id',
            ],
            ['another purpose', secret, 'notification', 'user-id'],
            ['another context', secret, 'session', 'another-user'],
        ])('rejects ciphertext bound to %s', (_case, key, purpose, context) => {
            const encrypted = service.aes256Encrypt(
                'secret value',
                secret,
                'session',
                'user-id'
            );

            expect(() =>
                service.aes256Decrypt(encrypted, key, purpose, context)
            ).toThrow(HelperDecryptFailedException);
        });

        it.each([
            '',
            'one.two.three',
            'one.two.three.four.five',
            'invalid.invalid.invalid.invalid',
        ])('rejects the malformed payload %j', payload => {
            expect(() =>
                service.aes256Decrypt(payload, secret, 'session', 'user-id')
            ).toThrow(HelperDecryptFailedException);
        });

        it.each(['not-base64url', Buffer.alloc(47).toString('base64url')])(
            'rejects the invalid root secret %j',
            invalidSecret => {
                expect(() =>
                    service.aes256Encrypt(
                        'value',
                        invalidSecret,
                        'session',
                        'user-id'
                    )
                ).toThrow(HelperEncryptionSecretInvalidException);
            }
        );
    });
});
