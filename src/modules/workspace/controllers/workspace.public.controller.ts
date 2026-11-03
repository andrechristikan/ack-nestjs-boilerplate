import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { RequestRequiredStringSchema } from '@common/request/validations/request.required-string.validation';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { WorkspaceInvitePreviewRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-preview.request.dto';
import type { WorkspaceInvitePreviewRequestDto } from '@modules/workspace/dtos/request/workspace.invite-preview.request.dto';
import { WorkspaceInvitePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspacePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import { WorkspaceHttpService } from '@modules/workspace/services/http/workspace.http.service';
import { WorkspaceInviteHttpService } from '@modules/workspace/services/http/workspace.invite.http.service';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.workspace')
@Controller({
    version: '1',
    path: '/workspace',
})
export class WorkspacePublicController {
    constructor(
        private readonly workspaceHttpService: WorkspaceHttpService,
        private readonly workspaceInviteHttpService: WorkspaceInviteHttpService
    ) {}

    @Doc({
        summary:
            'safe, unauthenticated preview of a workspace invite (workspace name, inviter, offered role); never the token or internal ids',
    })
    @Response('workspace.invite.preview', {
        schema: WorkspaceInvitePreviewResponseSchema,
    })
    @FeatureFlagProtected('workspace')
    @RequestThrottle({ route: EnumRequestThrottleRoute.moderate })
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/invite/preview')
    async invitePreview(
        @Body({ schema: WorkspaceInvitePreviewRequestSchema })
        body: WorkspaceInvitePreviewRequestDto
    ): Promise<IResponseReturn<WorkspaceInvitePreviewResponseDto>> {
        return this.workspaceInviteHttpService.previewInvite(body);
    }

    @Doc({
        summary:
            'public workspace profile by slug, so a non-member can obtain the workspace id a join request needs',
    })
    @Response('workspace.preview', {
        schema: WorkspacePreviewResponseSchema,
    })
    @FeatureFlagProtected('workspace')
    @RequestThrottle({ route: EnumRequestThrottleRoute.moderate })
    @ApiKeyProtected()
    @Get('/preview/:slug')
    async preview(
        @Param('slug', { schema: RequestRequiredStringSchema })
        slug: string
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceHttpService.previewWorkspace(slug);
    }
}
