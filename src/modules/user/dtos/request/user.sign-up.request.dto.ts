import { faker } from '@faker-js/faker';
import { ApiProperty, OmitType } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { IsPassword } from '@common/request/validations/request.is-password.validation';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { ENUM_USER_SIGN_UP_FROM } from '@prisma/client';

export class UserSignUpRequestDto extends OmitType(UserCreateRequestDto, [
    'roleId',
] as const) {
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
    password: string;

    @ApiProperty({
        description: 'boolean marketing',
        example: true,
        required: true,
    })
    @IsNotEmpty()
    @IsBoolean()
    marketing: boolean;

    @ApiProperty({
        description: 'boolean cookies',
        example: true,
        required: true,
    })
    @IsNotEmpty()
    @IsBoolean()
    cookies: boolean;

    @ApiProperty({
        description: 'enum user sign up from',
        example: ENUM_USER_SIGN_UP_FROM.mobile,
        required: true,
        enum: [ENUM_USER_SIGN_UP_FROM.mobile, ENUM_USER_SIGN_UP_FROM.website],
    })
    @IsNotEmpty()
    @IsString()
    @IsEnum([ENUM_USER_SIGN_UP_FROM.mobile, ENUM_USER_SIGN_UP_FROM.website])
    from: ENUM_USER_SIGN_UP_FROM;
}
