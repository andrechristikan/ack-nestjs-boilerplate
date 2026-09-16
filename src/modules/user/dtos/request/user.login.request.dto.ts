import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { validateEmail } from '@common/request/validations/request.custom-email.validation';
import { EnumUserLoginFrom } from '@generated/prisma-client';
import { DeviceRequestSchema } from '@modules/device/dtos/request/device.request.dto';

export const UserLoginRequestSchema = z.strictObject({
    email: z
        .string()
        .trim()
        .toLowerCase()
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

export type UserLoginRequestDto = z.infer<typeof UserLoginRequestSchema>;
