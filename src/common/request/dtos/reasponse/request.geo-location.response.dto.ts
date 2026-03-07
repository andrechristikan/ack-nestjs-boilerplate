import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class RequestGeoLocationResponseDto {
    @ApiProperty({
        description: 'Latitude of the geo-location',
        example: faker.location.latitude(),
    })
    latitude: number;

    @ApiProperty({
        description: 'Longitude of the geo-location',
        example: faker.location.longitude(),
    })
    longitude: number;

    @ApiProperty({
        description: 'Country code of the geo-location',
        example: faker.location.country(),
    })
    country: string;

    @ApiProperty({
        description: 'Region code of the geo-location',
        example: faker.location.state(),
    })
    region: string;

    @ApiProperty({
        description: 'City name of the geo-location',
        example: faker.location.city(),
    })
    city: string;
}
