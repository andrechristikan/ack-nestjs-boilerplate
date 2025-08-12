import { faker } from '@faker-js/faker';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UserMobileNumberResponseDto {
    @ApiProperty({
        example: `8${faker.string.fromCharacters('1234567890', {
            min: 7,
            max: 11,
        })}`,
        required: true,
        maxLength: 20,
        minLength: 8,
    })
    number: string;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    countryId: string;

    @ApiProperty({
        type: CountryResponseDto,
        oneOf: [{ $ref: getSchemaPath(CountryResponseDto) }],
        required: false,
    })
    @Type(() => CountryResponseDto)
    country?: CountryResponseDto;
}
