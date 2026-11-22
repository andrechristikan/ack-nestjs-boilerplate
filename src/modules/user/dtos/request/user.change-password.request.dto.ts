import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { UserReauthenticationRequestSchema } from '@modules/user/dtos/request/user.reauthentication.request.dto';
import {
    UserPasswordMaxLength,
    UserPasswordMinLength,
} from '@modules/user/constants/user.constant';

/** @public */
export const UserChangePasswordRequestSchema =
    UserReauthenticationRequestSchema.extend({
        newPassword: z
            .string()
            .min(UserPasswordMinLength)
            .max(UserPasswordMaxLength)
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
