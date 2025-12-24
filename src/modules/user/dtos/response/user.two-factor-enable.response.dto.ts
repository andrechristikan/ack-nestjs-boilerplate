import { ApiProperty } from '@nestjs/swagger';

export class UserTwoFactorEnableResponseDto {
    @ApiProperty({
        required: true,
        description:
            'List of newly generated backup codes. Each code can be used once.',
        type: [String],
        example: ['ABCD1234EF', 'ZXCV5678GH'],
    })
    backupCodes: string[];
}
