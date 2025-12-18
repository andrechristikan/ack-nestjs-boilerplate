import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    ValidateIf,
} from 'class-validator';

export class UserTwoFactorDisableRequestDto {
    @ApiProperty({
        description: '6 digit code from authenticator app',
        example: '987654',
        required: false,
    })
    @ValidateIf(o => !o.backupCode)
    @IsString()
    @IsNotEmpty()
    @Matches(/^[0-9]{6,8}$/)
    code?: string;

    @ApiProperty({
        description: 'One-time backup code (will be consumed if used)',
        example: 'ZXCV1234VB',
        required: false,
    })
    @ValidateIf(o => !o.code)
    @IsString()
    @IsOptional()
    backupCode?: string;
}
