import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { WorkspaceInvitePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspacePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import type { WorkspacePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import { applyDecorators } from '@nestjs/common';

export function WorkspacePublicInvitePreviewDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'safe, unauthenticated preview of a workspace invite (workspace name, inviter, offered role); never the token or internal ids',
        }),
        DocAuth({ xApiKey: true }),
        DocGuard({ featureFlag: true }),
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
        DocAuth({ xApiKey: true }),
        DocGuard({ featureFlag: true }),
        DocResponse<WorkspacePreviewResponseDto>('workspace.preview', {
            schema: WorkspacePreviewResponseSchema,
        })
    );
}
