import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class UserPasswordDto {
    @IsString()
    @IsNotEmpty()
    password: string;

    @IsNotEmpty()
    @IsDate()
    @Type(() => Date)
    passwordExpired: Date;

    @IsNotEmpty()
    @IsDate()
    @Type(() => Date)
    passwordCreated: Date;

    @IsString()
    @IsNotEmpty()
    salt: string;
}
