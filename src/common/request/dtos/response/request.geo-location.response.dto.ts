import { z } from 'zod';
import { faker } from '@faker-js/faker';

/** Response shape representing resolved geolocation data derived from the client's IP address. */
export const RequestGeoLocationResponseSchema = z.object({
    latitude: z.number().meta({
        description: 'Latitude of the geo-location',
        example: faker.location.latitude(),
    }),
    longitude: z.number().meta({
        description: 'Longitude of the geo-location',
        example: faker.location.longitude(),
    }),
    country: z.string().meta({
        description: 'Country code of the geo-location',
        example: faker.location.country(),
    }),
    region: z.string().meta({
        description: 'Region code of the geo-location',
        example: faker.location.state(),
    }),
    city: z.string().meta({
        description: 'City name of the geo-location',
        example: faker.location.city(),
    }),
});

export type RequestGeoLocationResponseDto = z.infer<
    typeof RequestGeoLocationResponseSchema
>;
