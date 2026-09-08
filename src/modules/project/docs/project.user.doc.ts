import {
    Doc,
    DocAuth,
    DocOneOf,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import {
    ProjectDocParamsId,
    ProjectMemberDocParamsId,
} from '@modules/project/constants/project.doc.constant';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableSearch,
    ProjectMemberDefaultAvailableOrderBy,
} from '@modules/project/constants/project.list.constant';
import {
    ProjectMemberResponseDto,
    ProjectMemberResponseSchema,
} from '@modules/project/dtos/response/project.member.response.dto';
import {
    ProjectResponseDto,
    ProjectResponseSchema,
} from '@modules/project/dtos/response/project.response.dto';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { HttpStatus, applyDecorators } from '@nestjs/common';

const NotFoundDoc = DocOneOf(HttpStatus.NOT_FOUND, {
    statusCode: EnumProjectStatusCodeError.notFound,
    messagePath: 'project.error.notFound',
});

const RoleForbiddenDoc = DocOneOf(HttpStatus.FORBIDDEN, {
    statusCode: EnumProjectStatusCodeError.roleForbidden,
    messagePath: 'project.error.roleForbidden',
});

const MemberForbiddenDoc = DocOneOf(HttpStatus.FORBIDDEN, {
    statusCode: EnumProjectStatusCodeError.memberForbidden,
    messagePath: 'project.error.memberForbidden',
});

const MemberPeerForbiddenDoc = DocOneOf(HttpStatus.FORBIDDEN, {
    statusCode: EnumProjectStatusCodeError.memberPeerForbidden,
    messagePath: 'project.error.memberPeerForbidden',
});

const MemberNotFoundDoc = DocOneOf(HttpStatus.NOT_FOUND, {
    statusCode: EnumProjectStatusCodeError.memberNotFound,
    messagePath: 'project.error.memberNotFound',
});

export function ProjectUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list projects in the current workspace; workspace owner/admin see all, others only assigned projects',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocResponsePaging<ProjectResponseDto>('project.list', {
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
        RoleForbiddenDoc,
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
        NotFoundDoc,
        MemberForbiddenDoc,
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
        NotFoundDoc,
        RoleForbiddenDoc,
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
        NotFoundDoc,
        RoleForbiddenDoc,
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumProjectStatusCodeError.slugAlreadyExists,
            messagePath: 'project.error.slugAlreadyExists',
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
        NotFoundDoc,
        RoleForbiddenDoc,
        DocResponse('project.softDelete')
    );
}

export function ProjectMemberUserListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list members of a project, subject to visibility' }),
        DocRequest({ params: ProjectDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        DocResponsePaging<ProjectMemberResponseDto>('project.member.list', {
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
        NotFoundDoc,
        RoleForbiddenDoc,
        MemberPeerForbiddenDoc,
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
            messagePath: 'workspace.error.memberNotFound',
        }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumProjectStatusCodeError.memberAlreadyAssigned,
            messagePath: 'project.error.memberAlreadyAssigned',
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
        NotFoundDoc,
        RoleForbiddenDoc,
        MemberNotFoundDoc,
        MemberPeerForbiddenDoc,
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
        NotFoundDoc,
        RoleForbiddenDoc,
        MemberNotFoundDoc,
        MemberPeerForbiddenDoc,
        DocResponse('project.member.remove')
    );
}

export function ProjectMemberUserLeaveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'leave a project; any project role may leave' }),
        DocRequest({ params: ProjectDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        NotFoundDoc,
        MemberForbiddenDoc,
        DocResponse('project.member.leave')
    );
}
