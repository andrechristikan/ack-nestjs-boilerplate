import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength,
    IsOptional,
    IsUUID,
} from 'class-validator';
import { IsPassword } from 'src/common/request/validations/request.is-password.validation';

export class UserCreateRequestDto {
    @ApiProperty({
        example: faker.internet.email(),
        required: true,
        maxLength: 100,
    })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @Type(() => String)
    readonly email: string;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    readonly role: string;

    @ApiProperty({
        example: faker.person.firstName(),
        required: true,
        maxLength: 50,
        minLength: 1,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(50)
    @Type(() => String)
    readonly firstName: string;

    @ApiProperty({
        example: faker.person.lastName(),
        required: true,
        maxLength: 50,
        minLength: 1,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(50)
    @Type(() => String)
    readonly lastName: string;

    @ApiProperty({
        example: faker.helpers.arrayElement(['62', '65']),
        required: false,
        description: 'Country phone code',
        maxLength: 4,
    })
    @IsString()
    @IsOptional()
    @MaxLength(4)
    readonly mobileNumberCode?: string;

    @ApiProperty({
        example: `8${faker.string.fromCharacters('1234567890', {
            min: 7,
            max: 11,
        })}`,
        required: false,
        maxLength: 20,
        minLength: 8,
    })
    @IsString()
    @IsOptional()
    @MinLength(8)
    @MaxLength(20)
    @Type(() => String)
    readonly mobileNumber?: string;

    @ApiProperty({
        description: 'string password',
        example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
            .alphanumeric(5)
            .toUpperCase()}@@!123`,
        required: true,
        maxLength: 50,
        minLength: 8,
    })
    @IsNotEmpty()
    @IsPassword()
    @MinLength(8)
    @MaxLength(50)
    readonly password: string;
}
