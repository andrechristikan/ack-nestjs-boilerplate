import { z } from 'zod';
import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';

export const AwsS3PresignPartRequestSchema = AwsS3PresignRequestSchema.extend({
    partNumber: z.number().int().meta({
        description: 'Part number for multipart upload',
        example: 1,
    }),
    uploadId: z.string().min(1).meta({
        description: 'Upload ID for multipart upload',
        example: '1',
    }),
});

export type AwsS3PresignPartRequestDto = z.infer<
    typeof AwsS3PresignPartRequestSchema
>;
