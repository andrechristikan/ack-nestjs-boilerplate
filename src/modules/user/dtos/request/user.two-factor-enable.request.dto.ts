import { IsTwoFactorCode } from '@modules/auth/validations/auth.two-factor-code.validation';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserTwoFactorEnableRequestDto {
    @ApiProperty({
        description: `digit code from authenticator app`,
        example: '654321',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @IsTwoFactorCode()
    code: string;
}
