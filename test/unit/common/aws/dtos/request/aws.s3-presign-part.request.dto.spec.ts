import { AwsS3PresignPartRequestSchema } from '@common/aws/dtos/request/aws.s3-presign-part.request.dto';

describe('AwsS3PresignPartRequestSchema', () => {
    const payload = {
        key: 'users/507f1f77bcf86cd799439011/profile/avatar.jpg',
        size: 1024,
        partNumber: 1,
        uploadId: 'upload-1',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = AwsS3PresignPartRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an empty uploadId', () => {
        const result = AwsS3PresignPartRequestSchema.safeParse({
            ...payload,
            uploadId: '',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['uploadId'], code: 'too_small' }),
        ]);
    });

    it('rejects a non-integer partNumber', () => {
        const result = AwsS3PresignPartRequestSchema.safeParse({
            ...payload,
            partNumber: 1.5,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['partNumber'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a partNumber above 10000', () => {
        const result = AwsS3PresignPartRequestSchema.safeParse({
            ...payload,
            partNumber: 10001,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['partNumber'], code: 'too_big' }),
        ]);
    });

    it('rejects a partNumber below 1', () => {
        const result = AwsS3PresignPartRequestSchema.safeParse({
            ...payload,
            partNumber: 0,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['partNumber'],
                code: 'too_small',
            }),
        ]);
    });

    it('accepts the highest partNumber 10000', () => {
        const result = AwsS3PresignPartRequestSchema.parse({
            ...payload,
            partNumber: 10000,
        });

        expect(result.partNumber).toBe(10000);
    });

    it('rejects an undeclared key', () => {
        const result = AwsS3PresignPartRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a uploadId of 1024 characters and rejects one of 1025', () => {
        expect(() =>
            AwsS3PresignPartRequestSchema.parse({
                ...payload,
                uploadId: 'a'.repeat(1024),
            })
        ).not.toThrow();
        const result = AwsS3PresignPartRequestSchema.safeParse({
            ...payload,
            uploadId: 'a'.repeat(1025),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['uploadId'], code: 'too_big' }),
        ]);
    });
});
