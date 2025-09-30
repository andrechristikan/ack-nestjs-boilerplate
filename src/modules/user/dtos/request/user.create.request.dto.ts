import { faker } from '@faker-js/faker';
import {
    ApiProperty,
    IntersectionType,
    OmitType,
    PickType,
} from '@nestjs/swagger';
import {
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { Transform } from 'class-transformer';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';

export class UserCreateRequestDto {
    @ApiProperty({
        example: faker.internet.email(),
        required: true,
        maxLength: 100,
    })
    @IsCustomEmail()
    @IsNotEmpty()
    @MaxLength(100)
    @Transform(({ value }) => value.toLowerCase().trim())
    email: Lowercase<string>;

    @ApiProperty({
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    roleId: string;

    @ApiProperty({
        example: faker.person.fullName(),
        required: false,
        maxLength: 100,
        minLength: 1,
    })
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(100)
    name?: string;

    @ApiProperty({
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    countryId: string;
}

export class UserCreateSocialRequestDto extends IntersectionType(
    OmitType(UserCreateRequestDto, ['email', 'roleId']),
    PickType(UserLoginRequestDto, ['from']),
    PickType(UserSignUpRequestDto, ['marketing', 'cookie'])
) {}
