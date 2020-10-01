import { IsString, IsLowercase, IsNotEmpty } from 'class-validator';

export class UserUpdateRequest {
    @IsString()
    @IsNotEmpty()
    @IsLowercase()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    @IsLowercase()
    lastName: string;
}
