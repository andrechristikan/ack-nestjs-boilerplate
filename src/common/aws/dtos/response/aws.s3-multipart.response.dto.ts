import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { AwsS3MultipartPartResponseSchema } from '@common/aws/dtos/response/aws.s3-multipart-part.response.dto';
import { AwsS3ResponseSchema } from '@common/aws/dtos/response/aws.s3.response.dto';

/**
 * Response shape for an AWS S3 multipart upload session.
 * @public
 */
export const AwsS3MultipartResponseSchema = AwsS3ResponseSchema.extend({
    uploadId: z.string().meta({
        description: 'Upload id from aws after init multipart',
        example: faker.string.alpha({ length: 20, casing: 'upper' }),
    }),
    lastPartNumber: z.number().meta({
        description: 'Last part number uploaded',
        example: 1,
    }),
    maxPartNumber: z.number().meta({
        description: 'Max part number, or length of the chunk',
        example: 200,
    }),
    parts: z.array(AwsS3MultipartPartResponseSchema).meta({
        description: 'Uploaded parts of the multipart object',
        example: [],
    }),
});

/**
 * S3 multipart upload session with its parts.
 * @public
 */
export type AwsS3MultipartResponseDto = z.infer<
    typeof AwsS3MultipartResponseSchema
>;
