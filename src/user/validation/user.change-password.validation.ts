import { IsString, IsNotEmpty } from 'class-validator';
import { IsPasswordStrong } from 'src/helper/helper.decorator';

export class UserChangePasswordValidation {
    @IsPasswordStrong()
    @IsNotEmpty()
    readonly newPassword: string;

    @IsString()
    @IsNotEmpty()
    readonly oldPassword: string;
}
