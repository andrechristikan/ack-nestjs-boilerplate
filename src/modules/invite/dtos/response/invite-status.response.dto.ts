import { ApiProperty } from '@nestjs/swagger';

export class InviteStatusResponseDto {
    @ApiProperty({
        required: true,
        enum: ['not_sent', 'pending', 'expired', 'completed', 'deleted'],
    })
    status: 'not_sent' | 'pending' | 'expired' | 'completed' | 'deleted';

    @ApiProperty({
        required: false,
    })
    expiresAt?: Date;

    @ApiProperty({
        required: false,
        description: 'Seconds remaining before expiration when status is pending',
    })
    remainingSeconds?: number;

    @ApiProperty({
        required: false,
    })
    sentAt?: Date;

    @ApiProperty({
        required: false,
    })
    completedAt?: Date;

    @ApiProperty({
        required: false,
        description: 'Timestamp when the invitation was deleted',
    })
    deletedAt?: Date;
}
