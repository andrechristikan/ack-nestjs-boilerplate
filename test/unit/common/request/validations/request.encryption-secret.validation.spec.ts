import { RequestEncryptionSecretSchema } from '@common/request/validations/request.encryption-secret.validation';

describe('RequestEncryptionSecretSchema', () => {
    it('parses exactly 64 base64url characters', () => {
        const secret = 'A'.repeat(64);

        expect(RequestEncryptionSecretSchema.parse(secret)).toBe(secret);
    });

    it('rejects a value shorter than 64 characters', () => {
        const result = RequestEncryptionSecretSchema.safeParse('A'.repeat(63));

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'too_small' }),
        ]);
    });

    it('reports a length issue for a value shorter than 64 characters', () => {
        const result = RequestEncryptionSecretSchema.safeParse('A'.repeat(63));

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'too_small' }),
        ]);
    });

    it('rejects a value carrying a non-base64url character', () => {
        const result = RequestEncryptionSecretSchema.safeParse(
            `${'A'.repeat(63)}+`
        );

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'invalid_format' }),
        ]);
    });
});
