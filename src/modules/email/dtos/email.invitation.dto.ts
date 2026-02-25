import { ApiProperty } from '@nestjs/swagger';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EnumRoleScope } from '@prisma/client';

export class EmailInvitationDto extends EmailVerificationDto {
    @ApiProperty({
        required: true,
        enum: ['project_member', 'tenant_member'],
    })
    invitationType: 'project_member' | 'tenant_member';

    @ApiProperty({
        required: true,
        example: 'project',
    })
    roleScope: EnumRoleScope;

    @ApiProperty({
        required: true,
        example: 'Core Platform',
    })
    contextName: string;
}
