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
    ProjectDocParamsProjectMemberId,
} from '@modules/project/constants/project.doc.constant';
import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberInviteCreateRequestDto } from '@modules/project/dtos/request/project-member-invite.create.request.dto';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
import { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function ProjectTenantSharedListDoc(): MethodDecorator {
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

export function ProjectTenantSharedCreateDoc(): MethodDecorator {
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

export function ProjectTenantSharedGetDoc(): MethodDecorator {
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

export function ProjectTenantSharedUpdateDoc(): MethodDecorator {
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

export function ProjectTenantSharedUpdateSlugDoc(): MethodDecorator {
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

export function ProjectTenantSharedDeleteDoc(): MethodDecorator {
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

export function ProjectTenantSharedCreateMemberDoc(): MethodDecorator {
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

export function ProjectTenantSharedCreateMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create project member invite',
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
            dto: ProjectMemberInviteCreateRequestDto,
        }),
        DocResponse<InviteCreateResponseDto>('project.member.invite.create', {
            httpStatus: HttpStatus.CREATED,
            dto: InviteCreateResponseDto,
        })
    );
}

export function ProjectTenantSharedSendMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'send project member invite',
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
        DocResponse<InviteSendResponseDto>('project.member.invite.send', {
            httpStatus: HttpStatus.CREATED,
            dto: InviteSendResponseDto,
        })
    );
}

export function ProjectTenantSharedUpdateMemberDoc(): MethodDecorator {
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

export function ProjectTenantSharedListMembersDoc(): MethodDecorator {
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

export function ProjectTenantSharedListMemberRolesDoc(): MethodDecorator {
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
        DocResponse<RoleListResponseDto>('project.member.roles', {
            dto: RoleListResponseDto,
        })
    );
}
