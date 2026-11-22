import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestEmailSchema } from '@common/request/validations/request.email.validation';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import { UserClaimUsernameRequestSchema } from '@modules/user/dtos/request/user.claim-username.request.dto';

/** @public */
export const UserCreateRequestSchema = UserClaimUsernameRequestSchema.extend({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .max(100)
        .pipe(RequestEmailSchema)
        .meta({
            description: 'Email address of the user to create',
            example: faker.internet.email(),
        })
        .transform(value => value as Lowercase<string>),
    roleId: RequestUuidSchema.meta({
        description: 'Identifier of the role to assign',
        example: faker.string.uuid(),
    }),
    name: z.string().min(1).max(100).optional().meta({
        description: 'Display name of the user to create',
        example: faker.person.fullName(),
    }),
    countryId: RequestUuidSchema.meta({
        description: 'Identifier of the user country',
        example: faker.string.uuid(),
    }),
});

/** @public */
export type UserCreateRequestDto = z.infer<typeof UserCreateRequestSchema>;
