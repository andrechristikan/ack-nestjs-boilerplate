import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { CountryPhoneCodeRegex } from '@modules/country/constants/country.constant';
import { UserCreateRequestSchema } from '@modules/user/dtos/request/user.create.request.dto';

/**
 * Validates the body for adding a mobile number.
 * @public
 */
export const UserAddMobileNumberRequestSchema = UserCreateRequestSchema.pick({
    countryId: true,
}).extend({
    number: z
        .string()
        .transform(value => value.replaceAll(/[\s\-.()]/g, ''))
        .pipe(z.string().min(8).max(22).regex(/^\d+$/))
        .meta({
            description:
                'Mobile number without the country phone code; spaces, dashes, dots and parentheses are removed, the rest must be digits',
            example: `8${faker.string.fromCharacters('1234567890', {
                min: 7,
                max: 11,
            })}`,
        }),
    phoneCode: z.string().regex(CountryPhoneCodeRegex).meta({
        description:
            'Country calling code of the mobile number, E.164 form with a leading +',
        example: '+62',
    }),
});

/**
 * Body for adding a mobile number.
 * @public
 */
export type UserAddMobileNumberRequestDto = z.infer<
    typeof UserAddMobileNumberRequestSchema
>;
