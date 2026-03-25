import { ApiProperty } from '@nestjs/swagger';
import { ProjectInviteStatusResponseDto } from '@modules/project/dtos/response/project-invite-status.response.dto';

export class ProjectInviteSendResponseDto {
    @ApiProperty({
        required: true,
        type: ProjectInviteStatusResponseDto,
    })
    invite: ProjectInviteStatusResponseDto;

    @ApiProperty({
        required: true,
    })
    resendAvailableAt: Date;
}
