import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    Doc,
    DocAuth,
    DocProjectPermissionProtected,
    DocRequest,
    DocResponse,
    DocResponsePaging,
    DocTenantMemberProtected,
    DocTenantPermissionProtected,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    ProjectDocParamsId,
    ProjectDocParamsProjectMemberId,
} from '@modules/project/constants/project.doc.constant';
import { InvitationCreateRequestDto } from '@modules/invitation/dtos/request/invitation.create.request.dto';
import { InvitationCreateResponseDto } from '@modules/invitation/dtos/response/invitation-create.response.dto';
import { InvitationSendResponseDto } from '@modules/invitation/dtos/response/invitation-send.response.dto';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
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
        DocTenantPermissionProtected(),
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
        DocTenantPermissionProtected(),
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

export function ProjectTenantSharedCreateMemberInvitationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create project member invitation',
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
            dto: InvitationCreateRequestDto,
        }),
        DocResponse<InvitationCreateResponseDto>(
            'project.member.invitation.create',
            {
                httpStatus: HttpStatus.CREATED,
                dto: InvitationCreateResponseDto,
            }
        )
    );
}

export function ProjectTenantSharedSendMemberInvitationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'send project member invitation',
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
        DocResponse<InvitationSendResponseDto>('project.member.invitation.send', {
            httpStatus: HttpStatus.CREATED,
            dto: InvitationSendResponseDto,
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
