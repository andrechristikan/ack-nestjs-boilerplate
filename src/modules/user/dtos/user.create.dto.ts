import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsEmail,
    MaxLength,
    MinLength,
    IsUUID,
    IsOptional,
    ValidateIf,
    IsEnum,
} from 'class-validator';
import { IsPasswordStrong } from 'src/common/request/validations/request.is-password-strong.validation';
import { MobileNumberAllowed } from 'src/common/request/validations/request.mobile-number-allowed.validation';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';

export class UserCreateDto {
    @ApiProperty({
        example: faker.internet.email(),
        required: true,
    })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @Type(() => String)
    readonly email: string;

    @ApiProperty({
        example: faker.person.firstName(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(30)
    @Type(() => String)
    readonly firstName: string;

    @ApiProperty({
        example: faker.person.lastName(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(30)
    @Type(() => String)
    readonly lastName: string;

    @ApiProperty({
        example: `628${faker.string.fromCharacters('1234567890', {
            min: 7,
            max: 11,
        })}`,
        required: false,
    })
    @IsString()
    @IsOptional()
    @MinLength(10)
    @MaxLength(14)
    @ValidateIf((e) => e.mobileNumber !== '')
    @Type(() => String)
    @MobileNumberAllowed()
    readonly mobileNumber?: string;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsUUID('4')
    readonly role: string;

    @ApiProperty({
        description: 'string password',
        example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
            .alphanumeric(5)
            .toUpperCase()}@@!123`,
        required: true,
    })
    @IsNotEmpty()
    @IsPasswordStrong()
    @MaxLength(50)
    readonly password: string;

    @IsEnum(ENUM_USER_SIGN_UP_FROM)
    @IsString()
    @IsNotEmpty()
    readonly signUpFrom: ENUM_USER_SIGN_UP_FROM;
}
