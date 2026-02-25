import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatusResponseDto } from '@modules/invitation/dtos/response/invitation-status.response.dto';

export class InvitationListResponseDto {
    @ApiProperty({ required: true })
    id: string;

    @ApiProperty({ required: true })
    userId: string;

    @ApiProperty({ required: true })
    email: string;

    @ApiProperty({ required: true, type: InvitationStatusResponseDto })
    status: InvitationStatusResponseDto;

    @ApiProperty({ required: false, type: Object, nullable: true })
    metadata: Record<string, unknown> | null;

    @ApiProperty({ required: true })
    createdAt: Date;
}
