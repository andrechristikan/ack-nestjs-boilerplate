import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import {
    WorkspaceMemberProtectedDocErrors,
    WorkspaceMemberStoreKey,
    WorkspaceProtectedDocErrors,
    WorkspaceRoleMetaKey,
    WorkspaceRoleProtectedDocErrors,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import { WorkspaceRoleGuard } from '@modules/workspace/guards/workspace.role.guard';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { WorkspaceGuardMissingException } from '@modules/workspace/exceptions/workspace.guard-missing.exception';
import { WorkspaceMemberGuardMissingException } from '@modules/workspace/exceptions/workspace.member-guard-missing.exception';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import type {
    IWorkspaceField,
    IWorkspaceFieldValue,
    IWorkspaceMemberField,
    IWorkspaceMemberFieldValue,
} from '@modules/workspace/interfaces/workspace.interface';

/** @public */
export function WorkspaceProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        DocErrors(...WorkspaceProtectedDocErrors)
    );
}

/** @public */
export const WorkspaceCurrent = createParamDecorator<
    IWorkspaceField | undefined,
    Workspace | IWorkspaceFieldValue
>((field: IWorkspaceField | undefined): Workspace | IWorkspaceFieldValue => {
    const workspace =
        ClsServiceManager.getClsService().get<Workspace | null>(
            WorkspaceStoreKey
        ) ?? null;
    if (workspace === null) {
        throw new WorkspaceGuardMissingException();
    }

    const fieldKey = field ?? null;
    if (fieldKey === null) {
        return workspace;
    }

    const value = workspace[fieldKey] ?? null;
    if (value === null) {
        throw new RequestContextMissingException(
            `${WorkspaceStoreKey}.${field}`
        );
    }

    return value;
});

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

/** @public */
export const WorkspaceMemberCurrent = createParamDecorator<
    IWorkspaceMemberField | undefined,
    WorkspaceMember | IWorkspaceMemberFieldValue
>(
    (
        field: IWorkspaceMemberField | undefined
    ): WorkspaceMember | IWorkspaceMemberFieldValue => {
        const workspaceMember =
            ClsServiceManager.getClsService().get<WorkspaceMember | null>(
                WorkspaceMemberStoreKey
            ) ?? null;
        if (workspaceMember === null) {
            throw new WorkspaceMemberGuardMissingException();
        }

        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return workspaceMember;
        }

        const value = workspaceMember[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(
                `${WorkspaceMemberStoreKey}.${field}`
            );
        }

        return value;
    }
);
