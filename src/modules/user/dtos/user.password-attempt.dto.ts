import { IsNotEmpty, IsNumber } from 'class-validator';

export class UserPasswordAttemptDto {
    @IsNumber()
    @IsNotEmpty()
    passwordAttempt: number;
}
