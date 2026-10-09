import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumUserGender } from '@generated/prisma-client/client';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

/**
 * Validates the body replacing the signed-in user profile.
 * @public
 */
export const UserUpdateProfileRequestSchema = UserCreateRequestSchema.pick({
    countryId: true,
}).extend({
    name: z.string().min(1).max(100).nullable().meta({
        description: 'Display name of the user; null clears it',
        example: faker.person.fullName(),
    }),
    gender: z.enum(EnumUserGender).meta({
        description: 'Gender of the user',
        example: EnumUserGender.male,
    }),
});

/**
 * Body replacing the signed-in user profile.
 * @public
 */
export type UserUpdateProfileRequestDto = z.infer<
    typeof UserUpdateProfileRequestSchema
>;
