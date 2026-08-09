import { faker } from '@faker-js/faker';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** Safe, minimal invite preview for an unauthenticated accept-page — never the token or an internal id. */
export class WorkspaceInvitePreviewResponseDto {
    @ApiProperty({
        required: true,
        description: 'Name of the workspace the invite is for',
        example: 'Acme',
    })
    @Expose()
    workspaceName: string;

    @ApiProperty({
        required: true,
        description: 'Display name of the person who sent the invite',
        example: faker.person.fullName(),
    })
    @Expose()
    inviterName: string;

    @ApiProperty({
        required: true,
        example: EnumWorkspaceMemberRole.member,
        enum: EnumWorkspaceMemberRole,
    })
    @Expose()
    workspaceRole: EnumWorkspaceMemberRole;

    @ApiProperty({
        required: true,
        example: faker.date.future(),
    })
    @Expose()
    expiredAt: Date;
}
