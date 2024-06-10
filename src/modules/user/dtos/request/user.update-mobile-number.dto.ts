import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UserUpdateMobileNumberDto {
    @ApiProperty({
        example: faker.string.uuid(),
        required: true,
        description: 'Country phone code',
    })
    @IsString()
    @IsUUID()
    @IsNotEmpty()
    readonly country: string;

    @ApiProperty({
        example: `8${faker.string.fromCharacters('1234567890', {
            min: 7,
            max: 11,
        })}`,
        required: true,
        maxLength: 20,
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(20)
    @Type(() => String)
    readonly number: string;
}
