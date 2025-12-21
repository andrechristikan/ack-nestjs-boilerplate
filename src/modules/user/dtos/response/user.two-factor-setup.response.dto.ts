import { ApiProperty } from '@nestjs/swagger';

export class UserTwoFactorSetupResponseDto {
    @ApiProperty({
        required: true,
        description: 'Base32 encoded secret to be stored in authenticator apps',
        example: 'JBSWY3DPEHPK3PXP',
    })
    secret: string;

    @ApiProperty({
        required: true,
        description:
            'otpauth URL compatible with Google Authenticator and similar apps',
        example:
            'otpauth://totp/ACK%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACK',
    })
    otpauthUrl: string;
}
