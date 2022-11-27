import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    MaxLength,
    IsBoolean,
    IsOptional,
    ValidateIf,
    IsString,
} from 'class-validator';

export class AuthLoginDto {
    @ApiProperty({
        example: faker.internet.userName(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @Type(() => String)
    readonly username: string;

    @ApiProperty({
        description:
            'if true refresh token expired will extend to 30d, else 7d',
        example: false,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    @ValidateIf((e) => e.rememberMe !== '')
    readonly rememberMe?: boolean;

    @ApiProperty({
        description: 'string password',
        example: `${faker.random.alphaNumeric(5).toLowerCase()}${faker.random
            .alphaNumeric(5)
            .toUpperCase()}@@!123`,
        required: true,
    })
    @IsNotEmpty()
    @Type(() => String)
    @IsString()
    readonly password: string;
}
