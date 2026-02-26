import { ApiProperty } from '@nestjs/swagger';
import { InviteStatusResponseDto } from '@modules/invite/dtos/response/invite-status.response.dto';

export class InviteSendResponseDto {
    @ApiProperty({
        required: true,
        type: InviteStatusResponseDto,
    })
    invite: InviteStatusResponseDto;

    @ApiProperty({
        required: true,
    })
    resendAvailableAt: Date;
}
