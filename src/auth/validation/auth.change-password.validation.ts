import { IsString, IsNotEmpty } from 'class-validator';
import { IsPasswordStrong } from 'src/request/request.decorator';

export class AuthChangePasswordValidation {
    @IsPasswordStrong()
    @IsNotEmpty()
    readonly newPassword: string;

    @IsString()
    @IsNotEmpty()
    readonly oldPassword: string;
}
