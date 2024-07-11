import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserLoginRequestDto {
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.internet.email(),
    })
    @IsString()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'string password',
        required: true,
        nullable: false,
        example: faker.string.alphanumeric(10),
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}
