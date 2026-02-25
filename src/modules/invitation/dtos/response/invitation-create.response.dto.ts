import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatusResponseDto } from '@modules/invitation/dtos/response/invitation-status.response.dto';

export class InvitationCreateResponseDto {
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
        type: InvitationStatusResponseDto,
    })
    invitation: InvitationStatusResponseDto;
}
