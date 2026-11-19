import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import {
    ProjectContextStoreKey,
    ProjectProtectedDocErrors,
    ProjectRoleMetaKey,
    ProjectRoleProtectedDocErrors,
} from '@modules/project/constants/project.constant';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type {
    IProjectContext,
    IProjectContextPatch,
} from '@modules/project/interfaces/project.interface';
import { ApiParam } from '@nestjs/swagger';
import { DocErrors } from '@common/doc/decorators/doc.decorator';

/** @public */
export const ProjectContext = createParamDecorator((): IProjectContext => {
    const stored =
        ClsServiceManager.getClsService().get<IProjectContextPatch | null>(
            ProjectContextStoreKey
        ) ?? null;
    const project = stored?.project ?? null;
    if (project === null) {
        throw new RequestContextMissingException(ProjectContextStoreKey);
    }

    return { project, projectMember: stored?.projectMember ?? null };
});

/** @public */
export function ProjectProtected(
    ...roles: EnumProjectMemberRole[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(ProjectGuard),
        SetMetadata(ProjectRoleMetaKey, roles),
        ApiParam({
            name: 'projectId',
            required: true,
            type: 'string',
            description: 'Project identifier',
        }),
        DocErrors(
            ...(roles.length === 0
                ? ProjectProtectedDocErrors
                : ProjectRoleProtectedDocErrors)
        )
    );
}
