import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';
import { CountryResponseSchema } from '@modules/country/dtos/response/country.response.dto';

/**
 * Mobile number registered to a user, with the country that owns its calling code.
 */
export const UserMobileNumberResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
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
    phoneCode: z
        .string()
        .min(1)
        .max(6)
        .meta({
            description: 'Country calling code of the mobile number',
            example: faker.location.countryCode('alpha-2'),
        }),
    country: CountryResponseSchema.meta({
        description: 'Country of the mobile number',
    }),
});

export type UserMobileNumberResponseDto = z.infer<
    typeof UserMobileNumberResponseSchema
>;
