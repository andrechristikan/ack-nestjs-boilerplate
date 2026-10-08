import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { RequestEmailSchema } from '@common/request/validations/request.email.validation';
import { EnumUserLoginFrom } from '@generated/prisma-client/client';
import { DeviceRequestSchema } from '@modules/device/dtos/request/device.request.dto';

/**
 * Validates the body for signing in with email and password.
 * @public
 */
export const UserLoginRequestSchema = z.strictObject({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .max(100)
        .pipe(RequestEmailSchema)
        .meta({
            description: 'Email address used to log in',
            example: faker.internet.email(),
        })
        .transform(value => value as Lowercase<string>),
    password: z
        .string()
        .min(1)
        .meta({
            description: 'string password',
            example: faker.string.alphanumeric(10),
        }),
    from: z.enum(EnumUserLoginFrom).meta({
        description: 'from where the user is logging in',
        example: EnumUserLoginFrom.website,
    }),
    device: DeviceRequestSchema.meta({
        description: 'Device information',
    }),
});

/**
 * Body for signing in with email and password.
 * @public
 */
export type UserLoginRequestDto = z.infer<typeof UserLoginRequestSchema>;
