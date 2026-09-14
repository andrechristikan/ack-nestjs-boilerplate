import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

export const UserAddMobileNumberRequestSchema = UserCreateRequestSchema.pick({
    countryId: true,
}).extend({
    number: z
        .string()
        .min(8)
        .max(22)
        .meta({
            description: 'Mobile number without the country phone code',
            example: `8${faker.string.fromCharacters('1234567890', {
                min: 7,
                max: 11,
            })}`,
        }),
    phoneCode: z.string().min(1).max(6).meta({
        description: 'Country calling code of the mobile number',
        example: '62',
    }),
});

export type UserAddMobileNumberRequestDto = z.infer<
    typeof UserAddMobileNumberRequestSchema
>;

export const UserUpdateMobileNumberRequestSchema =
    UserAddMobileNumberRequestSchema;

export type UserUpdateMobileNumberRequestDto = z.infer<
    typeof UserUpdateMobileNumberRequestSchema
>;
