import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatusResponseDto } from '@modules/invitation/dtos/response/invitation-status.response.dto';

export class InvitationSendResponseDto {
    @ApiProperty({
        required: true,
        type: InvitationStatusResponseDto,
    })
    invitation: InvitationStatusResponseDto;

    @ApiProperty({
        required: true,
    })
    resendAvailableAt: Date;
}
