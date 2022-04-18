import { IsString, IsNotEmpty } from 'class-validator';
import { IsPasswordStrong } from 'src/utils/request/validation/request.is-password-strong.validation';

export class AuthChangePasswordDto {
    @IsPasswordStrong()
    @IsNotEmpty()
    readonly newPassword: string;

    @IsString()
    @IsNotEmpty()
    readonly oldPassword: string;
}
