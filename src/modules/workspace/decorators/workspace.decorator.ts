import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import {
    WorkspaceMemberProtectedDocErrors,
    WorkspaceProtectedDocErrors,
    WorkspaceRoleMetaKey,
    WorkspaceRoleProtectedDocErrors,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import { WorkspaceRoleGuard } from '@modules/workspace/guards/workspace.role.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { DocErrors } from '@common/doc/decorators/doc.decorator';

/** @public */
export function WorkspaceProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        DocErrors(...WorkspaceProtectedDocErrors)
    );
}

/** @public */
export function WorkspaceMemberProtected(
    ...roles: EnumWorkspaceMemberRole[]
): MethodDecorator {
    if (roles.length === 0) {
        return applyDecorators(
            UseGuards(WorkspaceMemberGuard),
            DocErrors(...WorkspaceMemberProtectedDocErrors)
        );
    }

    return applyDecorators(
        UseGuards(WorkspaceMemberGuard, WorkspaceRoleGuard),
        SetMetadata(WorkspaceRoleMetaKey, roles),
        DocErrors(...WorkspaceRoleProtectedDocErrors)
    );
}
