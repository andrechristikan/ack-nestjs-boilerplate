import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    Doc,
    DocAuth,
    DocProjectMemberProtected,
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
import { ProjectInviteCreateRequestDto } from '@modules/project/dtos/request/project-invite.create.request.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
import { ProjectInviteResponseDto } from '@modules/project/dtos/response/project-invite.response.dto';
import { ProjectInviteSendResponseDto } from '@modules/project/dtos/response/project-invite-send.response.dto';
import { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function ProjectUserListDoc(): MethodDecorator {
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

export function ProjectUserCreateDoc(): MethodDecorator {
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

export function ProjectUserGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get tenant project detail',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponse<ProjectResponseDto>('project.get', {
            dto: ProjectResponseDto,
        })
    );
}

export function ProjectUserUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update tenant project',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectUpdateRequestDto,
        }),
        DocResponse('project.update')
    );
}

export function ProjectUserUpdateSlugDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update tenant project slug',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectUpdateSlugRequestDto,
        }),
        DocResponse('project.update')
    );
}

export function ProjectUserDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete tenant project',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponse('project.delete')
    );
}

export function ProjectUserCreateMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create project member invite',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectInviteCreateRequestDto,
        }),
        DocResponse<ProjectInviteResponseDto>('project.member.invite.create', {
            httpStatus: HttpStatus.CREATED,
            dto: ProjectInviteResponseDto,
        })
    );
}

export function ProjectUserSendMemberInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'send project member invite',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsInviteId,
        }),
        DocResponse<ProjectInviteSendResponseDto>(
            'project.member.invite.send',
            {
                httpStatus: HttpStatus.CREATED,
                dto: ProjectInviteSendResponseDto,
            }
        )
    );
}

export function ProjectUserListInvitesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list project member invites',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponsePaging<ProjectInviteResponseDto>(
            'project.member.invite.list',
            {
                dto: ProjectInviteResponseDto,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function ProjectUserRevokeInviteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke project member invite',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsInviteId,
        }),
        DocResponse('project.member.invite.revoke')
    );
}

export function ProjectUserUpdateMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update project member',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsProjectMemberId,
            bodyType: EnumDocRequestBodyType.json,
            dto: ProjectMemberUpdateRequestDto,
        }),
        DocResponse('project.member.update')
    );
}

export function ProjectUserListMembersDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list project members',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponsePaging<ProjectMemberResponseDto>('project.member.list', {
            dto: ProjectMemberResponseDto,
            type: EnumPaginationType.offset,
        })
    );
}

export function ProjectUserListUserInvitesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list pending project invites for the current user',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<ProjectInviteResponseDto>('project.invite.list', {
            dto: ProjectInviteResponseDto,
            type: EnumPaginationType.offset,
        })
    );
}

export function ProjectUserLeaveMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'leave project',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsId,
        }),
        DocResponse('project.member.leave')
    );
}

export function ProjectUserRevokeMemberDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'revoke project member access',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocTenantMemberProtected(),
        DocProjectMemberProtected(),
        DocRequest({
            params: ProjectDocParamsProjectMemberId,
        }),
        DocResponse('project.member.revoke')
    );
}

export function ProjectUserClaimInviteDoc(): MethodDecorator {
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
