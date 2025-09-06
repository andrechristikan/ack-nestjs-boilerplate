import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CountryRequestDto {
    @ApiProperty({
        required: true,
        description: 'Country name',
        example: faker.location.country(),
        maxLength: 100,
        minLength: 1,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    @MinLength(1)
    name: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Alpha 2 code version',
        example: faker.location.countryCode('alpha-2'),
        maxLength: 2,
        minLength: 2,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(2)
    @MinLength(2)
    @Transform(({ value }) => value.toUpperCase())
    alpha2Code: string;

    @ApiProperty({
        required: true,
        description: 'Country code, Alpha 3 code version',
        example: faker.location.countryCode('alpha-3'),
        maxLength: 3,
        minLength: 3,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(3)
    @MinLength(3)
    @Transform(({ value }) => value.toUpperCase())
    alpha3Code: string;

    @ApiProperty({
        required: true,
        description: 'Country phone code',
        example: [faker.helpers.arrayElement(['62', '65'])],
        maxLength: 4,
        isArray: true,
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsNotEmpty({ each: true })
    @IsString({ each: true })
    @MaxLength(4, { each: true })
    phoneCode: string[];

    @ApiProperty({
        required: true,
        example: faker.location.country(),
    })
    @IsNotEmpty()
    @IsString()
    continent: string;

    @ApiProperty({
        required: true,
        example: faker.location.timeZone(),
    })
    @IsNotEmpty()
    @IsString()
    timezone: string;
}
