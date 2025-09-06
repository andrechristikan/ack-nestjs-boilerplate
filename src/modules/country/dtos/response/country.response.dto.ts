import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';

export class CountryResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        description: 'Country name',
        example: faker.location.country(),
        maxLength: 100,
        minLength: 1,
    })
    name: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Alpha 2 code version',
        example: faker.location.countryCode('alpha-2'),
        maxLength: 2,
        minLength: 2,
    })
    alpha2Code: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Alpha 3 code version',
        example: faker.location.countryCode('alpha-3'),
        maxLength: 3,
        minLength: 3,
    })
    alpha3Code: string;

    @ApiProperty({
        required: true,
        description: 'Country phone code',
        example: [faker.helpers.arrayElement(['62', '65'])],
        maxLength: 4,
        minLength: 4,
        isArray: true,
    })
    phoneCode: string[];

    @ApiProperty({
        required: true,
        example: faker.location.country(),
    })
    continent: string;

    @ApiProperty({
        required: true,
        example: faker.location.timeZone(),
    })
    timezone: string;
}
