import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UserUpdatePasswordAttemptDto {
    @ApiProperty({
        required: true,
    })
    @IsNumber({ allowNaN: false, allowInfinity: false })
    @IsNotEmpty()
    passwordAttempt: number;
}
