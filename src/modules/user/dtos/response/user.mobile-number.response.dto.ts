import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class UserMobileNumberResponseDto extends DatabaseResponseDto {
    @ApiProperty({
        example: `8${faker.string.fromCharacters('1234567890', {
            min: 7,
            max: 11,
        })}`,
        required: true,
        maxLength: 20,
        minLength: 8,
        description: 'Mobile number without the country phone code',
    })
    @Expose()
    number: string;

    @ApiProperty({
        example: faker.location.countryCode('alpha-2'),
        required: true,
        maxLength: 6,
        minLength: 1,
        description: 'Country calling code of the mobile number',
    })
    @Expose()
    phoneCode: string;

    @ApiProperty({
        required: true,
        type: CountryResponseDto,
        description: 'Country of the mobile number',
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
            name: faker.location.country(),
            alpha2Code: faker.location.countryCode('alpha-2'),
            alpha3Code: faker.location.countryCode('alpha-3'),
            phoneCode: [faker.helpers.arrayElement(['62', '65'])],
            continent: faker.location.country(),
            timezone: faker.location.timeZone(),
        },
    })
    @Expose()
    @Type(() => CountryResponseDto)
    country: CountryResponseDto;
}
