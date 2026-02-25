import { ApiProperty } from '@nestjs/swagger';

export class InvitationPublicResponseDto {
    @ApiProperty({
        required: true,
    })
    email: string;

    @ApiProperty({
        required: true,
    })
    isVerified: boolean;

    @ApiProperty({
        required: true,
        enum: ['pending', 'expired', 'completed', 'deleted'],
    })
    status: 'pending' | 'expired' | 'completed' | 'deleted';

    @ApiProperty({
        required: false,
    })
    expiresAt?: Date;

    @ApiProperty({
        required: false,
    })
    remainingSeconds?: number;
}
