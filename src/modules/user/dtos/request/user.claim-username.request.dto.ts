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
    username: Lowercase<string>;
}
