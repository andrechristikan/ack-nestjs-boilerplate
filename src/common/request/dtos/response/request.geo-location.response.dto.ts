import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** Response DTO representing resolved geolocation data derived from the client's IP address. */
export class RequestGeoLocationResponseDto {
    @ApiProperty({
        description: 'Latitude of the geo-location',
        example: faker.location.latitude(),
    })
    @Expose()
    latitude: number;

    @ApiProperty({
        description: 'Longitude of the geo-location',
        example: faker.location.longitude(),
    })
    @Expose()
    longitude: number;

    @ApiProperty({
        description: 'Country code of the geo-location',
        example: faker.location.country(),
    })
    @Expose()
    country: string;

    @ApiProperty({
        description: 'Region code of the geo-location',
        example: faker.location.state(),
    })
    @Expose()
    region: string;

    @ApiProperty({
        description: 'City name of the geo-location',
        example: faker.location.city(),
    })
    @Expose()
    city: string;
}
