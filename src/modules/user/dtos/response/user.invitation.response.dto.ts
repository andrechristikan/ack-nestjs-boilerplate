import { ApiProperty } from '@nestjs/swagger';

export class UserInvitationResponseDto {
    @ApiProperty({
        required: true,
    })
    email: string;

    @ApiProperty({
        required: true,
        enum: ['pending', 'expired', 'completed'],
    })
    status: 'pending' | 'expired' | 'completed';

    @ApiProperty({
        required: false,
    })
    expiresAt?: Date;

    @ApiProperty({
        required: false,
    })
    remainingSeconds?: number;
}
