import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UserUpdateClaimUsernameRequestDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    @MinLength(3)
    username: string;
}
