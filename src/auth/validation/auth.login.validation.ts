import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class AuthLoginValidation {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
