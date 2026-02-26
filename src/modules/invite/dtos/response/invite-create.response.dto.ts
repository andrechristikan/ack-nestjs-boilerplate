import { ApiProperty } from '@nestjs/swagger';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';

export class InviteCreateResponseDto {
    @ApiProperty({
        required: false,
        description:
            'Membership id created by context-bound providers. Absent for context-free invitations.',
    })
    memberId?: string;

    @ApiProperty({
        required: true,
    })
    userId: string;

    @ApiProperty({
        required: true,
    })
    email: string;

    @ApiProperty({
        required: true,
        type: InviteStatusResponseDto,
    })
    invite: InviteStatusResponseDto;
}
