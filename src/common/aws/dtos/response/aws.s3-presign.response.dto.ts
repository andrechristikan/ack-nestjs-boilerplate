import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Response shape for an AWS S3 presigned URL.
 */
export const AwsS3PresignResponseSchema = z.object({
    key: z.string().meta({
        description: 'S3 object key/path',
        example: faker.system.filePath(),
    }),
    mime: z.string().meta({
        description: 'MIME type of the object',
        example: 'image/jpeg',
    }),
    extension: z.string().meta({
        description: 'File extension',
        example: 'jpg',
    }),
    presignUrl: z.string().meta({
        description: 'Presigned URL for uploading the object to S3',
        example: faker.internet.url(),
    }),
    expiredInSeconds: z.number().meta({
        description: 'Lifetime of the presigned URL in seconds',
        example: 1800,
    }),
});

export type AwsS3PresignResponseDto = z.infer<
    typeof AwsS3PresignResponseSchema
>;
