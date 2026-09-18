import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { CountryResponseSchema } from '@modules/country/dtos/response/country.response.dto';

export const CountryRequestSchema = CountryResponseSchema.pick({
    name: true,
    continent: true,
    timezone: true,
})
    .extend({
        alpha2Code: z
            .string()
            .length(2)
            .meta({
                description: 'Country code, Alpha 2 code version',
                example: faker.location.countryCode('alpha-2'),
            })
            .transform(value => value.toUpperCase()),
        alpha3Code: z
            .string()
            .length(3)
            .meta({
                description: 'Country code, Alpha 3 code version',
                example: faker.location.countryCode('alpha-3'),
            })
            .transform(value => value.toUpperCase()),
        phoneCodes: z
            .array(z.string().max(4))
            .min(1)
            .meta({
                description: 'Country phone code',
                example: [faker.helpers.arrayElement(['62', '65'])],
            }),
    })
    .strict();

export type CountryRequestDto = z.infer<typeof CountryRequestSchema>;
