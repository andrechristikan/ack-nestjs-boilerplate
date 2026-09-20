import { z } from 'zod';
import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';

/**
 * Validates the body that requests a presigned profile photo upload.
 * @public
 */
export const UserGeneratePhotoProfileRequestSchema =
    AwsS3PresignRequestSchema.pick({ size: true }).extend({
        extension: z.enum(EnumFileExtensionImage).meta({
            description: 'Image file extension of the profile photo',
            default: EnumFileExtensionImage.jpg,
            example: EnumFileExtensionImage.jpg,
        }),
    });

/**
 * Body that requests a presigned profile photo upload.
 * @public
 */
export type UserGeneratePhotoProfileRequestDto = z.infer<
    typeof UserGeneratePhotoProfileRequestSchema
>;
