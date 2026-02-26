import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { IsPassword } from '@common/request/validations/request.is-password.validation';

export class InviteSignupRequestDto {
    @ApiProperty({
        description: 'Invitation token',
        example: faker.string.alphanumeric(20),
    })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({
        description: 'First name',
        example: faker.person.firstName(),
        minLength: 1,
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(50)
    firstName: string;

    @ApiProperty({
        description: 'Last name',
        example: faker.person.lastName(),
        minLength: 1,
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(50)
    lastName: string;

    @ApiProperty({
        description: 'string password',
        example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
            .alphanumeric(5)
            .toUpperCase()}@@!123`,
        required: true,
        maxLength: 50,
        minLength: 8,
    })
    @IsPassword()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(50)
    password: string;
}
