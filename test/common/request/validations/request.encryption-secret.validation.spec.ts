import { RequestEncryptionSecretSchema } from '@common/request/validations/request.encryption-secret.validation';

describe('RequestEncryptionSecretSchema', () => {
    it('parses exactly 64 base64url characters', () => {
        const secret = 'A'.repeat(64);

        expect(RequestEncryptionSecretSchema.parse(secret)).toBe(secret);
    });

    it('rejects a value shorter than 64 characters', () => {
        expect(() =>
            RequestEncryptionSecretSchema.parse('A'.repeat(63))
        ).toThrow();
    });

    it('rejects a value carrying a non-base64url character', () => {
        expect(() =>
            RequestEncryptionSecretSchema.parse(`${'A'.repeat(63)}+`)
        ).toThrow();
    });
});
