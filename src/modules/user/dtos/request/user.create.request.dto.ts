import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    MaxLength,
    MinLength,
    IsUUID,
    IsEnum,
} from 'class-validator';
import { IsCustomEmail } from 'src/common/request/validations/request.custom-email.validation';
import { ENUM_USER_GENDER } from 'src/modules/user/enums/user.enum';

export class UserCreateRequestDto {
    @ApiProperty({
        example: faker.internet.email(),
        required: true,
        maxLength: 100,
    })
    @IsCustomEmail()
    @IsNotEmpty()
    @MaxLength(100)
    email: string;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    role: string;

    @ApiProperty({
        example: faker.person.fullName(),
        required: true,
        maxLength: 100,
        minLength: 1,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(100)
    name: string;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsString()
    @IsUUID()
    @IsNotEmpty()
    country: string;

    @ApiProperty({
        required: true,
        enum: ENUM_USER_GENDER,
        example: ENUM_USER_GENDER.MALE,
    })
    @IsString()
    @IsEnum(ENUM_USER_GENDER)
    @IsNotEmpty()
    gender: ENUM_USER_GENDER;
}
