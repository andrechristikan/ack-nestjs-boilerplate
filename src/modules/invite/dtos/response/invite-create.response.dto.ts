import { ApiProperty } from '@nestjs/swagger';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';

export class InviteCreateResponseDto {
    @ApiProperty({
        required: true,
        description:
            'Membership id created by the context-bound invite provider.',
    })
    memberId: string;

    @ApiProperty({
        required: true,
    })
    inviteId: string;

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
