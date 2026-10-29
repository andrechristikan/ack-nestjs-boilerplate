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
        expect(() =>
            AwsS3PresignPartRequestSchema.parse({ ...payload, uploadId: '' })
        ).toThrow();
    });

    it('rejects a non-integer partNumber', () => {
        expect(() =>
            AwsS3PresignPartRequestSchema.parse({
                ...payload,
                partNumber: 1.5,
            })
        ).toThrow();
    });

    it('rejects a partNumber above 10000', () => {
        expect(() =>
            AwsS3PresignPartRequestSchema.parse({
                ...payload,
                partNumber: 10001,
            })
        ).toThrow();
    });

    it('rejects a partNumber below 1', () => {
        expect(() =>
            AwsS3PresignPartRequestSchema.parse({ ...payload, partNumber: 0 })
        ).toThrow();
    });

    it('accepts the highest partNumber 10000', () => {
        const result = AwsS3PresignPartRequestSchema.parse({
            ...payload,
            partNumber: 10000,
        });

        expect(result.partNumber).toBe(10000);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AwsS3PresignPartRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});
