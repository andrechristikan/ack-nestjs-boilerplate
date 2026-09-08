import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { AwsS3ResponseSchema } from '@common/aws/dtos/response/aws.s3.response.dto';

/**
 * Response shape for a single part in an AWS S3 multipart upload.
 */
export const AwsS3MultipartPartResponseSchema = z.object({
    eTag: z.string().meta({
        description: 'ETag from aws after init multipart',
        example: faker.string.alpha({ length: 10, casing: 'upper' }),
    }),
    partNumber: z.number().meta({
        description: 'Part number in the multipart upload',
        example: 1,
    }),
    size: z.number().meta({
        description: 'Size of the part in bytes',
        example: 1024,
    }),
});

export type AwsS3MultipartPartResponseDto = z.infer<
    typeof AwsS3MultipartPartResponseSchema
>;

/**
 * Response shape for an AWS S3 multipart upload session.
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

export type AwsS3MultipartResponseDto = z.infer<
    typeof AwsS3MultipartResponseSchema
>;
