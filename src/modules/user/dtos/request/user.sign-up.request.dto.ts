import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestPasswordStrengthRegex } from '@common/request/constants/request.constant';
import { EnumUserSignUpFrom } from '@generated/prisma-client';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

export const UserSignUpRequestSchema = UserCreateRequestSchema.omit({
    roleId: true,
}).extend({
    password: z
        .string()
        .min(8)
        .max(50)
        .regex(RequestPasswordStrengthRegex, {
            error: () => 'request.error.isPassword.strong',
        })
        .meta({
            description: 'string password',
            example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
                .alphanumeric(5)
                .toUpperCase()}@@!123`,
        }),
    marketing: z.boolean().meta({
        description: 'boolean marketing',
        example: true,
    }),
    cookies: z.boolean().meta({
        description: 'boolean cookies',
        example: true,
    }),
    from: z.enum([EnumUserSignUpFrom.mobile, EnumUserSignUpFrom.website]).meta({
        description: 'enum user sign up from',
        example: EnumUserSignUpFrom.mobile,
    }),
    inviteToken: z
        .string()
        .min(1)
        .optional()
        .meta({
            description:
                'Optional plain workspace invite token. When provided, the account joins the invited workspace instead of getting a personal one',
            example: faker.string.alphanumeric(100),
        }),
});

export type UserSignUpRequestDto = z.infer<typeof UserSignUpRequestSchema>;
