import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** @public */
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

/** @public */
export type AwsS3MultipartPartResponseDto = z.infer<
    typeof AwsS3MultipartPartResponseSchema
>;
