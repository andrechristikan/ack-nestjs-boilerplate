import {
    WorkspaceContextStoreKey,
    WorkspaceMemberProtectedDocErrors,
    WorkspaceProtectedDocErrors,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import {
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type {
    IWorkspaceContext,
    IWorkspaceContextPatch,
} from '@modules/workspace/interfaces/workspace.interface';

/** @public */
export const WorkspaceContext = createParamDecorator((): IWorkspaceContext => {
    const stored =
        ClsServiceManager.getClsService().get<IWorkspaceContextPatch | null>(
            WorkspaceContextStoreKey
        ) ?? null;
    const workspaceId = stored?.workspaceId ?? null;
    const workspace = stored?.workspace ?? null;
    const workspaceMember = stored?.workspaceMember ?? null;
    if (
        workspaceId === null ||
        workspace === null ||
        workspaceMember === null
    ) {
        throw new RequestContextMissingException(WorkspaceContextStoreKey);
    }

    return { workspaceId, workspace, workspaceMember };
});

/** @public */
export function WorkspaceProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceGuard),
        DocErrors(...WorkspaceProtectedDocErrors)
    );
}

/** @public */
export function WorkspaceMemberProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(WorkspaceMemberGuard),
        DocErrors(...WorkspaceMemberProtectedDocErrors)
    );
}
