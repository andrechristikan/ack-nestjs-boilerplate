import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { AwsS3ObjectKeyRegex } from '@common/aws/constants/aws.constant';

export const AwsS3PresignRequestSchema = z.strictObject({
    key: z.string().min(1).regex(AwsS3ObjectKeyRegex).meta({
        description: 'Object key to presign in S3',
        example:
            'users/507f1f77bcf86cd799439011/profile/aB3xY9zQ1mN7pR2sT4vW.jpg',
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
