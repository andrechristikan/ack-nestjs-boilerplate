import { ApiProperty } from '@nestjs/swagger';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';

export class InviteListResponseDto {
    @ApiProperty({ required: true })
    id: string;

    @ApiProperty({ required: true })
    userId: string;

    @ApiProperty({ required: true })
    email: string;

    @ApiProperty({ required: true, type: InviteStatusResponseDto })
    status: InviteStatusResponseDto;

    @ApiProperty({ required: false, type: Object, nullable: true })
    metadata: Record<string, unknown> | null;

    @ApiProperty({ required: true })
    createdAt: Date;
}
