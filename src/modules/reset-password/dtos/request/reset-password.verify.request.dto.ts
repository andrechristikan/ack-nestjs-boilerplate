import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordVerifyRequestDto {
    @ApiProperty({
        required: true,
        minLength: 6,
        maxLength: 6,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(6)
    @MinLength(6)
    readonly otp: string;
}
