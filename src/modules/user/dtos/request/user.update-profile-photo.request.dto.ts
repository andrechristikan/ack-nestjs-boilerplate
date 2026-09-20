import { z } from 'zod';
import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';

/**
 * Validates the body for saving an uploaded profile photo.
 * @public
 */
export const UserUpdateProfilePhotoRequestSchema =
    AwsS3PresignRequestSchema.pick({ size: true }).extend({
        key: AwsS3PresignRequestSchema.shape.key.meta({
            description:
                'Key of the uploaded profile photo, as returned by the presign step',
        }),
    });

/**
 * Body for saving an uploaded profile photo.
 * @public
 */
export type UserUpdateProfilePhotoRequestDto = z.infer<
    typeof UserUpdateProfilePhotoRequestSchema
>;
