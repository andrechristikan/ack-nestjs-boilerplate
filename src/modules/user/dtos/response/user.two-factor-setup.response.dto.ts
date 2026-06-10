import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserTwoFactorSetupResponseDto {
    @ApiProperty({
        required: true,
        description: 'Base32 encoded secret to be stored in authenticator apps',
        example: 'JBSWY3DPEHPK3PXP',
    })
    @Expose()
    secret: string;

    @ApiProperty({
        required: true,
        description:
            'otpauth URL compatible with Google Authenticator and similar apps',
        example:
            'otpauth://totp/ACK%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACK',
    })
    @Expose()
    otpauthUrl: string;
}
