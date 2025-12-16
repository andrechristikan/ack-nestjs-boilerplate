import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    ValidateIf,
} from 'class-validator';

export class UserTwoFactorVerifyLoginRequestDto {
    @ApiProperty({
        description: 'Challenge token returned by the login endpoint when 2FA is required',
        example: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
    })
    @IsString()
    @IsNotEmpty()
    challengeToken: string;

    @ApiProperty({
        description: '6 digit code from authenticator app',
        example: '654321',
        required: false,
    })
    @ValidateIf(o => !o.backupCode)
    @IsString()
    @IsNotEmpty()
    @Matches(/^[0-9]{6,8}$/)
    code?: string;

    @ApiProperty({
        description: 'One-time backup code (will be consumed on success)',
        example: 'ABCD1234EF',
        required: false,
    })
    @ValidateIf(o => !o.code)
    @IsString()
    @IsOptional()
    backupCode?: string;
}
