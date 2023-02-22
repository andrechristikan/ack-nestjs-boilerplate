import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UserPasswordAttemptDto {
    @ApiProperty({
        name: 'passwordAttempt',
        description: 'password attempt of user',
        required: true,
        nullable: false,
    })
    @IsNumber()
    @IsNotEmpty()
    passwordAttempt: number;
}
