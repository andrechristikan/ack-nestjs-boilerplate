import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';

describe('AwsS3PresignRequestSchema', () => {
    const valid = {
        key: 'users/507f1f77bcf86cd799439011/profile/file.jpg',
        size: 1,
    };
    it('accepts a valid object grant', () =>
        expect(AwsS3PresignRequestSchema.parse(valid)).toEqual(valid));
    it.each([
        { ...valid, key: '' },
        { ...valid, key: 'secret?.txt' },
        { ...valid, size: 1.5 },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown grants', input =>
        expect(AwsS3PresignRequestSchema.safeParse(input).success).toBe(false)
    );
});
