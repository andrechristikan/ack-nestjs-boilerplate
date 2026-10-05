import { AwsS3PresignResponseSchema } from '@common/aws/dtos/response/aws.s3-presign.response.dto';

describe('AwsS3PresignResponseSchema', () => {
    const row = {
        key: 'users/avatar.jpg',
        mime: 'image/jpeg',
        extension: 'jpg',
        presignUrl: 'https://bucket.example.com/users/avatar.jpg?signature=abc',
        expiredInSeconds: 1800,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AwsS3PresignResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AwsS3PresignResponseSchema.parse({
            ...row,
            bucket: 'sample-bucket',
        });

        expect(result).toEqual(row);
    });
});
