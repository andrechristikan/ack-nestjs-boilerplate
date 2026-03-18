import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    Doc,
    DocAuth,
    DocProjectPermissionProtected,
    DocRequest,
    DocResponse,
    DocResponsePaging,
    DocTenantMemberProtected,
    DocTenantRoleProtected,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    ProjectDocParamsId,
    ProjectDocParamsInviteId,
    ProjectDocParamsProjectMemberId,
} from '@modules/project/constants/project.doc.constant';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberInviteCreateRequestDto } from '@modules/project/dtos/request/project-member-invite.create.request.dto';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
import { ProjectInviteResponseDto } from '@modules/project/dtos/response/project-invite.response.dto';
import { ProjectInviteSendResponseDto } from '@modules/project/dtos/response/project-invite-send.response.dto';
import { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function ProjectSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list tenant projects',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantRoleProtected(),
        DocResponsePaging<ProjectResponseDto>('project.list', {
            dto: ProjectResponseDto,
            type: EnumPaginationType.offset,
        })
    );
}

export function ProjectSharedCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create tenant project',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantRoleProtected(),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectCreateRequestDto,
        }),
        DocResponse<DatabaseIdDto>('project.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdDto,
        })
    );
}

export function ProjectSharedGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get tenant project detail',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponse<ProjectResponseDto>('project.get', {
            dto: ProjectResponseDto,
        })
    );
}

export function ProjectSharedUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update tenant project',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectUpdateRequestDto,
        }),
        DocResponse('project.update')
    );
}

export function ProjectSharedUpdateSlugDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update tenant project slug',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectUpdateSlugRequestDto,
        }),
        DocResponse('project.update')
    );
}

export function ProjectSharedDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete tenant project',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponse('project.delete')
    );
}

export function ProjectSharedCreateMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create project member',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectMemberCreateRequestDto,
        }),
        DocResponse<DatabaseIdDto>('project.member.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdDto,
        })
    );
}

export function ProjectSharedCreateMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create project member invite',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectMemberInviteCreateRequestDto,
        }),
        DocResponse<ProjectInviteResponseDto>('project.member.invite.create', {
            httpStatus: HttpStatus.CREATED,
            dto: ProjectInviteResponseDto,
        })
    );
}

export function ProjectSharedSendMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'send project member invite',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocRequest({
            params: ProjectDocParamsInviteId,
        }),
        DocResponse<ProjectInviteSendResponseDto>('project.member.invite.send', {
            httpStatus: HttpStatus.CREATED,
            dto: ProjectInviteSendResponseDto,
        })
    );
}

export function ProjectSharedListInvitesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list project member invites',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponsePaging<ProjectInviteResponseDto>('project.member.invite.list', {
            dto: ProjectInviteResponseDto,
            type: EnumPaginationType.offset,
        })
    );
}

export function ProjectSharedRevokeInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke project member invite',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocRequest({
            params: ProjectDocParamsInviteId,
        }),
        DocResponse('project.member.invite.revoke')
    );
}

export function ProjectSharedClaimInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'claim project invite (registered users)' }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: [{ name: 'token', required: true, type: 'string' }],
        }),
        DocResponse('project.member.invite.claim')
    );
}

export function ProjectSharedUpdateMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update project member',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsProjectMemberId,
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectMemberUpdateRequestDto,
        }),
        DocResponse('project.member.update')
    );
}

export function ProjectSharedListMembersDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list project members',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponsePaging<ProjectMemberResponseDto>('project.member.list', {
            dto: ProjectMemberResponseDto,
            type: EnumPaginationType.offset,
        })
    );
}

export function ProjectSharedListMemberRolesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list project member roles',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponse('project.member.roles')
    );
}

export function ProjectSharedLeaveMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'leave project',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponse('project.member.leave')
    );
}

export function ProjectSharedRevokeMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke project member access',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectPermissionProtected(),
        DocRequest({
            params: ProjectDocParamsProjectMemberId,
        }),
        DocResponse('project.member.revoke')
    );
}
