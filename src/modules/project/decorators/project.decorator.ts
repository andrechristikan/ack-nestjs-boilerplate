import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import {
    ProjectMemberProtectedDocErrors,
    ProjectProtectedDocErrors,
    ProjectRoleMetaKey,
    ProjectRoleProtectedDocErrors,
} from '@modules/project/constants/project.constant';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { DocErrors } from '@common/doc/decorators/doc.decorator';

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
