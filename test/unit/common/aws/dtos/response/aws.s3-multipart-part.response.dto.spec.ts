import { AwsS3MultipartPartResponseSchema } from '@common/aws/dtos/response/aws.s3-multipart-part.response.dto';

describe('AwsS3MultipartPartResponseSchema', () => {
    const row = {
        eTag: 'ABCDEFGHIJ',
        partNumber: 1,
        size: 1024,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AwsS3MultipartPartResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AwsS3MultipartPartResponseSchema.parse({
            ...row,
            uploadId: 'upload-1',
        });

        expect(result).toEqual(row);
    });
});
