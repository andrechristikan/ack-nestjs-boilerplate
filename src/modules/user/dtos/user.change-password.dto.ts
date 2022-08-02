import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { IsPasswordStrong } from 'src/common/request/validations/request.is-password-strong.validation';

export class UserChangePasswordDto {
    @IsPasswordStrong()
    @IsNotEmpty()
    @ApiProperty({
        description:
            'Your new password, this password can not be same with old password',
        required: true,
    })
    readonly newPassword: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        description: 'Your old password',
        required: true,
    })
    readonly oldPassword: string;
}
