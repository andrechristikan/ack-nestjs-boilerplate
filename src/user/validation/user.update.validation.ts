import { IsString, IsLowercase, IsNotEmpty } from 'class-validator';

export class UserUpdateValidation {
    @IsString()
    @IsNotEmpty()
    @IsLowercase()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    @IsLowercase()
    lastName: string;
}
