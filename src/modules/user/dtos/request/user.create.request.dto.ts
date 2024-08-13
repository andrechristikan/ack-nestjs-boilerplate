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
} from 'class-validator';

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
    @Type(() => String)
    name: string;

    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
    })
    @IsString()
    @IsUUID()
    @IsNotEmpty()
    country: string;
}
