import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';

/** @public */
export const UserChangePasswordRequestSchema =
    UserReauthenticationRequestSchema.extend({
        newPassword: z
            .string()
            .min(8)
            .max(64)
            .meta({
                description:
                    "new string password, newPassword can't same with the current password",
                example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
                    .alphanumeric(5)
                    .toUpperCase()}@@!123`,
            }),
    });

/** @public */
export type UserChangePasswordRequestDto = z.infer<
    typeof UserChangePasswordRequestSchema
>;
