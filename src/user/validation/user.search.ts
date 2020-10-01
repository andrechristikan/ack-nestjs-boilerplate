import {
    IsString,
} from 'class-validator';

export class UserSearchRequest {
    @IsString()
    country: string;

    @IsString()
    email: string;

    @IsString()
    firstName: string;

    @IsString()
    mobileNumber: string;
}
