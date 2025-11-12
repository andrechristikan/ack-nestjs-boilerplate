import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_USER_LOGIN_FROM } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UserLoginRequestDto {
    @ApiProperty({
        required: true,
        example: faker.internet.email(),
    })
    @IsString()
    @IsNotEmpty()
    @IsCustomEmail()
    @Transform(({ value }) => value.toLowerCase().trim())
    email: Lowercase<string>;

    @ApiProperty({
        description: 'string password',
        required: true,
        example: faker.string.alphanumeric(10),
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({
        description: 'from where the user is logging in',
        enum: ENUM_USER_LOGIN_FROM,
        example: ENUM_USER_LOGIN_FROM.website,
        required: true,
    })
    @IsNotEmpty()
    @IsEnum(ENUM_USER_LOGIN_FROM)
    from: ENUM_USER_LOGIN_FROM;
}
