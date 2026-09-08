import {
    Doc,
    DocAuth,
    DocOneOf,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import {
    WorkspaceDocParamsSlug,
    WorkspaceInviteTokenDocParamsId,
} from '@modules/workspace/constants/workspace.doc.constant';
import {
    WorkspaceInvitePreviewResponseDto,
    WorkspaceInvitePreviewResponseSchema,
} from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import {
    WorkspacePreviewResponseDto,
    WorkspacePreviewResponseSchema,
} from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function WorkspacePublicInvitePreviewDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'safe, unauthenticated preview of a workspace invite (workspace name, inviter, offered role); never the token or internal ids',
        }),
        DocRequest({ params: WorkspaceInviteTokenDocParamsId }),
        DocAuth({ xApiKey: true }),
        DocOneOf(HttpStatus.BAD_REQUEST, {
            statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            messagePath: 'workspace.error.inviteInvalid',
        }),
        DocResponse<WorkspaceInvitePreviewResponseDto>(
            'workspace.invite.preview',
            {
                schema: WorkspaceInvitePreviewResponseSchema,
            }
        )
    );
}

export function WorkspacePublicPreviewDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'public workspace profile by slug, so a non-member can obtain the workspace id a join request needs',
            description:
                'Returns 404 for an unknown slug, a soft-deleted workspace, and a workspace that is not public alike — one indistinguishable answer, so the endpoint cannot be used to probe for private slugs.',
        }),
        DocRequest({ params: WorkspaceDocParamsSlug }),
        DocAuth({ xApiKey: true }),
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.notFound,
            messagePath: 'workspace.error.notFound',
        }),
        DocResponse<WorkspacePreviewResponseDto>('workspace.preview', {
            schema: WorkspacePreviewResponseSchema,
        })
    );
}
