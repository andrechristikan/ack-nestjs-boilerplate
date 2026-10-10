import { AwsS3PresignPartResponseSchema } from '@common/aws/dtos/response/aws.s3-presign-part.response.dto';

describe('AwsS3PresignPartResponseSchema', () => {
    it('selects multipart presign fields and strips unknown values', () => {
        const result = AwsS3PresignPartResponseSchema.parse({
            key: 'file',
            mime: 'text/plain',
            extension: 'txt',
            presignUrl: 'https://example.com',
            expiredInSeconds: 60,
            partNumber: 1,
            size: 10,
            credential: 'secret',
        });
        expect(result).not.toHaveProperty('credential');
        expect(result.partNumber).toBe(1);
    });
});
