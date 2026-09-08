import { z } from 'zod';
import { AwsS3PresignResponseSchema } from '@common/aws/dtos/response/aws.s3-presign.response.dto';

/**
 * Response shape for a presigned URL targeting a specific multipart upload part.
 */
export const AwsS3PresignPartResponseSchema = AwsS3PresignResponseSchema.extend(
    {
        partNumber: z.number().meta({
            description: 'Part number in the multipart upload',
            example: 1,
        }),
        size: z.number().meta({
            description: 'Size of the part in bytes',
            example: 1024,
        }),
    }
);

export type AwsS3PresignPartResponseDto = z.infer<
    typeof AwsS3PresignPartResponseSchema
>;
