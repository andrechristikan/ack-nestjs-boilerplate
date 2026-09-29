import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3ResponseSchema } from '@common/aws/dtos/response/aws.s3.response.dto';

describe('AwsS3ResponseSchema', () => {
    const row = {
        bucket: 'sample-bucket',
        key: 'users/avatar.jpg',
        cdnUrl: 'https://cdn.example.com/users/avatar.jpg',
        completedUrl: 'https://bucket.example.com/users/avatar.jpg',
        mime: 'image/jpeg',
        extension: 'jpg',
        access: EnumAwsS3Accessibility.public,
        size: 1024,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AwsS3ResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a null cdnUrl', () => {
        const result = AwsS3ResponseSchema.parse({ ...row, cdnUrl: null });

        expect(result.cdnUrl).toBeNull();
    });

    it('strips an undeclared key', () => {
        const result = AwsS3ResponseSchema.parse({
            ...row,
            data: Buffer.from('leak'),
        });

        expect(result).toEqual(row);
    });
});
