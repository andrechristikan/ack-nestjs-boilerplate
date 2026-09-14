import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';

/**
 * HTTP response shape for S3 object metadata — excludes internal streaming data fields.
 */
export const AwsS3ResponseSchema = z.object({
    bucket: z.string().meta({
        description: 'S3 bucket name',
        example: faker.string.alpha({ length: 10, casing: 'upper' }),
    }),
    key: z.string().meta({
        description: 'S3 object key/path',
        example: faker.system.filePath(),
    }),
    cdnUrl: z
        .string()
        .nullable()
        .meta({
            description: 'CDN URL for the object',
            example: `${faker.internet.url()}/${faker.system.filePath()}`,
        }),
    completedUrl: z.string().meta({
        description: 'Complete URL to access the object',
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
    }),
    mime: z.string().meta({
        description: 'MIME type of the object',
        example: 'image/jpeg',
    }),
    extension: z.string().meta({
        description: 'File extension',
        example: 'jpg',
    }),
    access: z.enum(EnumAwsS3Accessibility).meta({
        description: 'Access level for the S3 object',
        example: EnumAwsS3Accessibility.public,
    }),
    size: z.number().meta({
        description: 'Size of the object in bytes',
        example: 1024,
    }),
});

export type AwsS3ResponseDto = z.infer<typeof AwsS3ResponseSchema>;
