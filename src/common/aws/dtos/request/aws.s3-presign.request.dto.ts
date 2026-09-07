import { z } from 'zod';
import { faker } from '@faker-js/faker';

export const AwsS3PresignRequestSchema = z.strictObject({
    key: z.string().min(1).meta({
        description: 'Object key to presign in S3',
        example: faker.system.filePath(),
    }),
    size: z
        .number()
        .int()
        .meta({
            description: 'Object size in bytes',
            example: faker.number.int({ min: 1, max: 10_485_760 }),
        }),
});

export type AwsS3PresignRequestDto = z.infer<typeof AwsS3PresignRequestSchema>;
