import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsAlphanumeric,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UserClaimUsernameRequestDto {
    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    @MaxLength(50)
    @MinLength(3)
    @Transform(({ value }) => value.toLowerCase().trim())
    @ApiProperty({
        required: true,
        description: 'username to claim',
        example: 'john_doe123',
        maxLength: 50,
        minLength: 3,
    })
    username: Lowercase<string>;
}
