import { ApiProperty } from '@nestjs/swagger';
import { EnumProjectInviteStatus } from '@generated/prisma-client';

export class ProjectInvitePublicResponseDto {
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
        enum: EnumProjectInviteStatus,
    })
    status: EnumProjectInviteStatus;

    @ApiProperty({
        required: false,
    })
    expiresAt?: Date;

    @ApiProperty({
        required: false,
    })
    remainingSeconds?: number;
}
