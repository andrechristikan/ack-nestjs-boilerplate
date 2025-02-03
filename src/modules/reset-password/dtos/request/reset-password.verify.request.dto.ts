import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordVerifyRequestDto {
    @ApiProperty({
        required: true,
        minLength: 6,
        maxLength: 6,
        example: faker.number.int({ min: 100000, max: 999999 }),
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(6)
    @MinLength(6)
    otp: string;
}
