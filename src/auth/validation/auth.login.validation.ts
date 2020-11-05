import {
    IsString,
    IsNotEmpty,
} from 'class-validator';

export class AuthLoginValidation {
    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
