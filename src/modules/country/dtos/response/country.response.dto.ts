import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { DatabaseResponseSchema } from '@common/database/dtos/response/database.response.dto';

/**
 * Base country shape: the stored country row.
 */
export const CountryResponseSchema = DatabaseResponseSchema.omit({
    deletedAt: true,
    deletedBy: true,
}).extend({
    name: z.string().min(1).max(100).meta({
        description: 'Country name',
        example: faker.location.country(),
    }),
    alpha2Code: z
        .string()
        .length(2)
        .meta({
            description: 'Country code, Alpha 2 code version',
            example: faker.location.countryCode('alpha-2'),
        }),
    alpha3Code: z
        .string()
        .length(3)
        .meta({
            description: 'Country code, Alpha 3 code version',
            example: faker.location.countryCode('alpha-3'),
        }),
    phoneCodes: z.array(z.string()).meta({
        description: 'Country phone code',
        example: [faker.helpers.arrayElement(['62', '65'])],
    }),
    continent: z.string().meta({
        description: 'Continent the country belongs to',
        example: faker.location.country(),
    }),
    timezone: z.string().meta({
        description: 'Timezone of the country',
        example: faker.location.timeZone(),
    }),
});

export type CountryResponseDto = z.infer<typeof CountryResponseSchema>;
