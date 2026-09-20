import { z } from 'zod';
import { EnumUserGender } from '@generated/prisma-client/client';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

/**
 * Validates the body for updating the signed-in user profile.
 * @public
 */
export const UserUpdateProfileRequestSchema = UserCreateRequestSchema.pick({
    name: true,
    countryId: true,
}).extend({
    gender: z.enum(EnumUserGender).meta({
        description: 'Gender of the user',
        example: EnumUserGender.male,
    }),
});

/**
 * Body for updating the signed-in user profile.
 * @public
 */
export type UserUpdateProfileRequestDto = z.infer<
    typeof UserUpdateProfileRequestSchema
>;
