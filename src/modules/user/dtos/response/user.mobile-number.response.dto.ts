import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';

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
    @Type(() => String)
    number: string;

    @ApiProperty({
        required: true,
        nullable: false,
        type: CountryShortResponseDto,
    })
    @Type(() => CountryShortResponseDto)
    country: CountryShortResponseDto;
}
