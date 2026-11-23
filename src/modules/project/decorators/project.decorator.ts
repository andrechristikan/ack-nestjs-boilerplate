import {
    ProjectContextStoreKey,
    ProjectMemberProtectedDocErrors,
    ProjectProtectedDocErrors,
} from '@modules/project/constants/project.constant';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import {
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
export function ProjectProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ProjectGuard),
        ApiParam({
            name: 'projectId',
            required: true,
            type: 'string',
            description: 'Project identifier',
        }),
        DocErrors(...ProjectProtectedDocErrors)
    );
}

/** @public */
export function ProjectMemberProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(ProjectMemberGuard),
        DocErrors(...ProjectMemberProtectedDocErrors)
    );
}
