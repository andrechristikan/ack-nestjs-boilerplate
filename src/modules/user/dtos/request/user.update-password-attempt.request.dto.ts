import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class UserUpdatePasswordAttemptRequestDto {
    @ApiProperty({
        required: true,
        type: 'integer',
    })
    @IsNumber({ allowNaN: false, allowInfinity: false })
    @IsNotEmpty()
    @Min(0)
    @Max(3)
    @Type(() => Number)
    passwordAttempt: number;
}
