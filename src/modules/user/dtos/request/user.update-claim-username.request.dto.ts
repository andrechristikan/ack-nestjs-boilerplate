import { Transform } from 'class-transformer';
import {
    IsAlphanumeric,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UserUpdateClaimUsernameRequestDto {
    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    @MaxLength(50)
    @MinLength(3)
    @Transform(({ value }) => value.toLowerCase().trim())
    username: string;
}
