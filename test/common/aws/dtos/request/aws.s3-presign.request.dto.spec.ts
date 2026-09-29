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
        expect(() =>
            AwsS3PresignRequestSchema.parse({ ...payload, key: '' })
        ).toThrow();
    });

    it('rejects a key carrying a character outside the object-key pattern', () => {
        expect(() =>
            AwsS3PresignRequestSchema.parse({
                ...payload,
                key: 'users/$/avatar.jpg',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            AwsS3PresignRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});
