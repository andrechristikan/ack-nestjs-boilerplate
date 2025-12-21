import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { IsTwoFactorBackupCode } from '@modules/auth/validations/auth.two-factor-backup-code.validation';
import { IsTwoFactorCode } from '@modules/auth/validations/auth.two-factor-code.validation';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class UserTwoFactorVerifyRequestDto {
    @ApiProperty({
        description:
            'Challenge token returned by the login endpoint when 2FA is required',
        example: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
    })
    @IsString()
    @IsNotEmpty()
    challengeToken: string;

    @ApiProperty({
        description: 'Two-factor authentication method',
        example: EnumAuthTwoFactorMethod.code,
        enum: EnumAuthTwoFactorMethod,
    })
    @IsString()
    @IsNotEmpty()
    @IsEnum(EnumAuthTwoFactorMethod)
    method: EnumAuthTwoFactorMethod;

    @ApiProperty({
        description: `digit code from authenticator app. required if method is "${
            EnumAuthTwoFactorMethod.code
        }"`,
        example: '654321',
        required: false,
    })
    @ValidateIf(o => o.method === EnumAuthTwoFactorMethod.code)
    @IsString()
    @IsNotEmpty()
    @IsTwoFactorCode()
    code?: string;

    @ApiProperty({
        description: 'One-time backup code (will be consumed on success)',
        example: 'ABCD1234EF',
        required: false,
    })
    @ValidateIf(o => o.method === EnumAuthTwoFactorMethod.backupCodes)
    @IsString()
    @IsNotEmpty()
    @IsTwoFactorBackupCode()
    backupCode?: string;
}
