import { z } from 'zod';
import { AwsS3PresignRequestSchema } from '@common/aws/dtos/request/aws.s3-presign.request.dto';
import { EnumUserGender } from '@generated/prisma-client';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

export const UserUpdateProfileRequestSchema = UserCreateRequestSchema.pick({
    name: true,
    countryId: true,
}).extend({
    gender: z.enum(EnumUserGender).meta({
        description: 'Gender of the user',
        example: EnumUserGender.male,
    }),
});

export type UserUpdateProfileRequestDto = z.infer<
    typeof UserUpdateProfileRequestSchema
>;

export const UserUpdateProfilePhotoRequestSchema =
    AwsS3PresignRequestSchema.pick({ size: true }).extend({
        photoKey: z.string().min(1).meta({
            description: 'photo path key',
            example: 'user/profile/unique-photo-key.jpg',
        }),
    });

export type UserUpdateProfilePhotoRequestDto = z.infer<
    typeof UserUpdateProfilePhotoRequestSchema
>;
