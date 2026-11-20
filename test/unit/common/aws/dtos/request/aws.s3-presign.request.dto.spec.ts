import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';

describe('AwsS3PresignRequestSchema', () => {
    const payload = {
        key: 'users/507f1f77bcf86cd799439011/profile/avatar.jpg',
        size: 1024,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = AwsS3PresignRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a key starting with a forbidden character', () => {
        const result = AwsS3PresignRequestSchema.safeParse({
            ...payload,
            key: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['key'], code: 'too_small' }),
            expect.objectContaining({ path: ['key'], code: 'invalid_format' }),
        ]);
    });

    it('rejects a key carrying a character outside the object-key pattern', () => {
        const result = AwsS3PresignRequestSchema.safeParse({
            ...payload,
            key: 'users/$/avatar.jpg',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['key'], code: 'invalid_format' }),
        ]);
    });

    it('rejects a size below 1', () => {
        const result = AwsS3PresignRequestSchema.safeParse({
            ...payload,
            size: 0,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['size'], code: 'too_small' }),
        ]);
    });

    it('rejects a non-integer size', () => {
        const result = AwsS3PresignRequestSchema.safeParse({
            ...payload,
            size: 1.5,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['size'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = AwsS3PresignRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a key of 1024 characters and rejects one of 1025', () => {
        expect(() =>
            AwsS3PresignRequestSchema.parse({
                ...payload,
                key: 'a'.repeat(1024),
            })
        ).not.toThrow();
        const result = AwsS3PresignRequestSchema.safeParse({
            ...payload,
            key: 'a'.repeat(1025),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['key'], code: 'too_big' }),
        ]);
    });
});
