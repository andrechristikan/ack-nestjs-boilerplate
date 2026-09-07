import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { validateEmail } from '@common/request/validations/request.custom-email.validation';
import { UserClaimUsernameRequestSchema } from '@modules/user/dtos/request/user.claim-username.request.dto';

export const UserCreateRequestSchema = UserClaimUsernameRequestSchema.extend({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .max(100)
        .superRefine((value, ctx) => {
            const validation = validateEmail(value);
            if (!validation.validated) {
                ctx.addIssue({
                    code: 'custom',
                    message: validation.messagePath,
                });
            }
        })
        .meta({
            description: 'Email address of the user to create',
            example: faker.internet.email(),
        })
        .transform(value => value as Lowercase<string>),
    roleId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .meta({
            description: 'Identifier of the role to assign',
            example: faker.database.mongodbObjectId(),
        }),
    name: z.string().min(1).max(100).optional().meta({
        description: 'Display name of the user to create',
        example: faker.person.fullName(),
    }),
    countryId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .meta({
            description: 'Identifier of the user country',
            example: faker.database.mongodbObjectId(),
        }),
});

export type UserCreateRequestDto = z.infer<typeof UserCreateRequestSchema>;
