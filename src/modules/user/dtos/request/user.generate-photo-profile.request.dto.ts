import { z } from 'zod';
import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';

export const UserGeneratePhotoProfileRequestSchema =
    AwsS3PresignRequestSchema.pick({ size: true }).extend({
        extension: z.enum(EnumFileExtensionImage).meta({
            description: 'Image file extension of the profile photo',
            default: EnumFileExtensionImage.jpg,
            example: EnumFileExtensionImage.jpg,
        }),
    });

export type UserGeneratePhotoProfileRequestDto = z.infer<
    typeof UserGeneratePhotoProfileRequestSchema
>;
