import { AwsS3PresignPartResponseSchema } from '@common/aws/dtos/response/aws.s3-presign-part.response.dto';

describe('AwsS3PresignPartResponseSchema', () => {
    const row = {
        key: 'users/avatar.jpg',
        mime: 'image/jpeg',
        extension: 'jpg',
        presignUrl: 'https://bucket.example.com/users/avatar.jpg?signature=abc',
        expiredInSeconds: 1800,
        partNumber: 1,
        size: 1024,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AwsS3PresignPartResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AwsS3PresignPartResponseSchema.parse({
            ...row,
            uploadId: 'upload-1',
        });

        expect(result).toEqual(row);
    });
});
