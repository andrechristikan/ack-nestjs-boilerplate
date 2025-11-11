import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserVerifyEmailRequestDto {
    @ApiProperty({
        description: 'Verification token',
        example: faker.string.alphanumeric(20),
    })
    @IsString()
    @IsNotEmpty()
    token: string;
}
