import { IsString } from 'class-validator';

export class UserSearchValidation {
    @IsString()
    email: string;

    @IsString()
    firstName: string;

    @IsString()
    mobileNumber: string;
}
