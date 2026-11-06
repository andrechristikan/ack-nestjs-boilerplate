import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import {
    ProjectMemberProtectedDocErrors,
    ProjectMemberStoreKey,
    ProjectProtectedDocErrors,
    ProjectRoleMetaKey,
    ProjectRoleProtectedDocErrors,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { ClsServiceManager } from 'nestjs-cls';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { ProjectGuardMissingException } from '@modules/project/exceptions/project.guard-missing.exception';
import { ProjectMemberGuardMissingException } from '@modules/project/exceptions/project.member-guard-missing.exception';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import type {
    IProjectField,
    IProjectFieldValue,
    IProjectMemberField,
    IProjectMemberFieldValue,
} from '@modules/project/interfaces/project.interface';

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
export const ProjectCurrent = createParamDecorator<
    IProjectField | undefined,
    Project | IProjectFieldValue
>((field: IProjectField | undefined): Project | IProjectFieldValue => {
    const project =
        ClsServiceManager.getClsService().get<Project | null>(
            ProjectStoreKey
        ) ?? null;
    if (project === null) {
        throw new ProjectGuardMissingException();
    }

    const fieldKey = field ?? null;
    if (fieldKey === null) {
        return project;
    }

    const value = project[fieldKey] ?? null;
    if (value === null) {
        throw new RequestContextMissingException(`${ProjectStoreKey}.${field}`);
    }

    return value;
});

/** @public */
export function ProjectMemberProtected(
    ...roles: EnumProjectMemberRole[]
): MethodDecorator {
    if (roles.length === 0) {
        return applyDecorators(
            UseGuards(ProjectMemberGuard),
            DocErrors(...ProjectMemberProtectedDocErrors)
        );
    }

    return applyDecorators(
        UseGuards(ProjectRoleGuard),
        SetMetadata(ProjectRoleMetaKey, roles),
        DocErrors(...ProjectRoleProtectedDocErrors)
    );
}

/** @public */
export const ProjectMemberCurrent = createParamDecorator<
    IProjectMemberField | undefined,
    ProjectMember | IProjectMemberFieldValue
>(
    (
        field: IProjectMemberField | undefined
    ): ProjectMember | IProjectMemberFieldValue => {
        const projectMember =
            ClsServiceManager.getClsService().get<ProjectMember | null>(
                ProjectMemberStoreKey
            ) ?? null;
        if (projectMember === null) {
            throw new ProjectMemberGuardMissingException();
        }

        const fieldKey = field ?? null;
        if (fieldKey === null) {
            return projectMember;
        }

        const value = projectMember[fieldKey] ?? null;
        if (value === null) {
            throw new RequestContextMissingException(
                `${ProjectMemberStoreKey}.${field}`
            );
        }

        return value;
    }
);
