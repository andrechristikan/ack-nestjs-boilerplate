import { ApiProperty } from '@nestjs/swagger';
import { EnumRoleScope } from '@generated/prisma-client';
import { InviteVerificationDto } from './invite-verification.dto';

export class InviteDto extends InviteVerificationDto {
    @ApiProperty({
        required: true,
        type: String,
        example: 'tenant_member',
    })
    inviteType: string;

    @ApiProperty({
        required: true,
        example: 'admin',
    })
    roleScope: EnumRoleScope;

    @ApiProperty({
        required: true,
        example: 'Core Platform',
    })
    contextName: string;
}
