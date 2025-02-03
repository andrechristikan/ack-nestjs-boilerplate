import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AuthLoginRequestDto {
    @ApiProperty({
        required: true,
        example: faker.internet.email(),
    })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'string password',
        required: true,
        example: faker.string.alphanumeric(10),
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}
