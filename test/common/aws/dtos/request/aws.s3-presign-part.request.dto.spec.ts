import { AwsS3PresignPartRequestSchema } from '@common/aws/dtos/request/aws.s3-presign-part.request.dto';

describe('AwsS3PresignPartRequestSchema', () => {
    const valid = {
        key: 'uploads/file.bin',
        size: 1,
        partNumber: 1,
        uploadId: 'upload',
    };
    it('accepts a valid multipart grant', () =>
        expect(AwsS3PresignPartRequestSchema.parse(valid)).toEqual(valid));
    it.each([
        { ...valid, partNumber: 1.5 },
        { ...valid, uploadId: '' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown grants', input =>
        expect(AwsS3PresignPartRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
