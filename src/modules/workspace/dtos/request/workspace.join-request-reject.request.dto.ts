import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class WorkspaceJoinRequestRejectRequestDto {
    @ApiProperty({
        description: 'Reason the join request is being rejected',
        example: EnumWorkspaceJoinRejectReason.wrongWorkspace,
        enum: EnumWorkspaceJoinRejectReason,
        required: true,
    })
    @IsNotEmpty()
    @IsEnum(EnumWorkspaceJoinRejectReason)
    rejectReasonCode: EnumWorkspaceJoinRejectReason;
}
