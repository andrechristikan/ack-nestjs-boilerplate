import { z } from 'zod';
import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';

/** @public */
export const UserUpdateProfilePhotoRequestSchema =
    AwsS3PresignRequestSchema.pick({ key: true }).extend({
        key: AwsS3PresignRequestSchema.shape.key.meta({
            description:
                'Key of the uploaded profile photo, as returned by the presign step',
        }),
    });

/** @public */
export type UserUpdateProfilePhotoRequestDto = z.infer<
    typeof UserUpdateProfilePhotoRequestSchema
>;
