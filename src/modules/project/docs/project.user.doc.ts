import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableSearch,
    ProjectMemberDefaultAvailableOrderBy,
} from '@modules/project/constants/project.list.constant';
import {
    ProjectDocParamsId,
    ProjectMemberDocParamsId,
} from '@modules/project/constants/project.doc.constant';
import { ProjectMemberResponseSchema } from '@modules/project/dtos/response/project.member.response.dto';
import type { ProjectMemberResponseDto } from '@modules/project/dtos/response/project.member.response.dto';
import { ProjectResponseSchema } from '@modules/project/dtos/response/project.response.dto';
import type { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function ProjectUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list projects in the current workspace; workspace owner/admin see all, others only assigned projects',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
        }),
        DocResponsePagination<ProjectResponseDto>('project.list', {
            schema: ProjectResponseSchema,
            availableSearch: ProjectDefaultAvailableSearch,
            availableOrderBy: ProjectCursorAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}

export function ProjectUserCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a project in the current workspace' }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
        }),
        DocResponse<ProjectResponseDto>('project.create', {
            schema: ProjectResponseSchema,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function ProjectUserGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get a project by id, subject to visibility' }),
        DocRequest({ params: ProjectDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
            project: true,
            projectRole: true,
        }),
        DocResponse<ProjectResponseDto>('project.get', {
            schema: ProjectResponseSchema,
        })
    );
}

export function ProjectUserUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'update a project name/description; workspace owner/admin or project admin',
        }),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
            project: true,
            projectRole: true,
        }),
        DocResponse<ProjectResponseDto>('project.update', {
            schema: ProjectResponseSchema,
        })
    );
}

export function ProjectUserUpdateSlugDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'update a project slug; workspace owner/admin or project admin',
        }),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
            project: true,
            projectRole: true,
        }),
        DocResponse<ProjectResponseDto>('project.updateSlug', {
            schema: ProjectResponseSchema,
        })
    );
}

export function ProjectUserSoftDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'soft-delete a project; workspace owner/admin only' }),
        DocRequest({ params: ProjectDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            workspaceRole: true,
            featureFlag: true,
            project: true,
        }),
        DocResponse('project.softDelete')
    );
}

export function ProjectMemberUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list members of a project, subject to visibility' }),
        DocRequest({ params: ProjectDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
            project: true,
            projectRole: true,
        }),
        DocResponsePagination<ProjectMemberResponseDto>('project.member.list', {
            schema: ProjectMemberResponseSchema,
            availableOrderBy: ProjectMemberDefaultAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}

export function ProjectMemberUserAssignDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'assign a workspace member to a project; assigning admin requires workspace owner/admin',
        }),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
            project: true,
            projectRole: true,
        }),
        DocResponse<ProjectMemberResponseDto>('project.member.assign', {
            schema: ProjectMemberResponseSchema,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function ProjectMemberUserUpdateRoleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'update a project member role; setting/touching admin requires workspace owner/admin',
        }),
        DocRequest({
            params: ProjectMemberDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
            project: true,
            projectRole: true,
        }),
        DocResponse('project.member.updateRole')
    );
}

export function ProjectMemberUserRemoveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'remove a project member; project admin cannot remove another admin or self (use leave)',
        }),
        DocRequest({ params: ProjectMemberDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
            project: true,
            projectRole: true,
        }),
        DocResponse('project.member.remove')
    );
}

export function ProjectMemberUserLeaveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'leave a project; any project role may leave' }),
        DocRequest({ params: ProjectDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            workspace: true,
            featureFlag: true,
            project: true,
            projectMember: true,
        }),
        DocResponse('project.member.leave')
    );
}
