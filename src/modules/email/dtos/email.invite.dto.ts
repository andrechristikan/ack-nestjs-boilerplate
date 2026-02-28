import { ApiProperty } from '@nestjs/swagger';
import { EmailVerificationDto } from '@modules/email/dtos/email.verification.dto';
import { EnumRoleScope } from '@prisma/client';

export class EmailInviteDto extends EmailVerificationDto {
    @ApiProperty({
        required: true,
        type: String,
        example: 'tenant_member',
    })
    invitationType: string;

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
