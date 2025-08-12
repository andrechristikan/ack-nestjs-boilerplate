import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsISO31661Alpha2,
    IsMongoId,
    IsNotEmpty,
    IsString,
    IsUppercase,
    MaxLength,
    MinLength,
} from 'class-validator';
import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';

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
        example: faker.database.mongodbObjectId(),
        required: true,
    })
    @IsNotEmpty()
    @IsMongoId()
    roleId: string;

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
        example: faker.string.alpha(2),
        minLength: 2,
        maxLength: 2,
        description: 'ISO 3166-1 alpha-2 country code',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsUppercase()
    @IsISO31661Alpha2()
    @MinLength(2)
    @MaxLength(2)
    country: string;
}
