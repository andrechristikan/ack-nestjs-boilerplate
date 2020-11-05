import {
    IsString,
} from 'class-validator';

export class UserSearchValidation{
    @IsString()
    country: string;

    @IsString()
    email: string;

    @IsString()
    firstName: string;

    @IsString()
    mobileNumber: string;
}
