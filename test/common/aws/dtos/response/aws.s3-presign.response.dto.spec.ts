import { AwsS3PresignResponseSchema } from '@common/aws/dtos/response/aws.s3-presign.response.dto';

describe('AwsS3PresignResponseSchema', () => {
    it('selects the public presign fields and strips secrets', () => {
        const result = AwsS3PresignResponseSchema.parse({
            key: 'file',
            mime: 'text/plain',
            extension: 'txt',
            presignUrl: 'https://example.com',
            expiredInSeconds: 60,
            credential: 'secret',
        });
        expect(result).toEqual({
            key: 'file',
            mime: 'text/plain',
            extension: 'txt',
            presignUrl: 'https://example.com',
            expiredInSeconds: 60,
        });
    });
});
