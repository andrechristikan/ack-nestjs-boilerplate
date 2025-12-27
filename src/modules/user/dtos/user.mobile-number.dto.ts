import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UserMobileNumberResponseDto extends DatabaseDto {
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
        example: faker.location.countryCode('alpha-2'),
        required: true,
        maxLength: 6,
        minLength: 1,
    })
    phoneCode: string;

    @ApiProperty({
        required: true,
        type: CountryResponseDto,
    })
    @Type(() => CountryResponseDto)
    country: CountryResponseDto;
}
