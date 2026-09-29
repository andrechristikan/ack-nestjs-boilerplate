import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3MultipartResponseSchema } from '@common/aws/dtos/response/aws.s3-multipart.response.dto';

describe('AwsS3MultipartResponseSchema', () => {
    const row = {
        bucket: 'sample-bucket',
        key: 'users/avatar.jpg',
        cdnUrl: 'https://cdn.example.com/users/avatar.jpg',
        completedUrl: 'https://bucket.example.com/users/avatar.jpg',
        mime: 'image/jpeg',
        extension: 'jpg',
        access: EnumAwsS3Accessibility.public,
        size: 1024,
        uploadId: 'sample-upload-id',
        lastPartNumber: 1,
        maxPartNumber: 200,
        parts: [{ eTag: 'ABCDEFGHIJ', partNumber: 1, size: 1024 }],
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AwsS3MultipartResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses an empty parts array', () => {
        const result = AwsS3MultipartResponseSchema.parse({
            ...row,
            parts: [],
        });

        expect(result.parts).toEqual([]);
    });

    it('strips an undeclared key', () => {
        const result = AwsS3MultipartResponseSchema.parse({
            ...row,
            data: Buffer.from('leak'),
        });

        expect(result).toEqual(row);
    });
});
