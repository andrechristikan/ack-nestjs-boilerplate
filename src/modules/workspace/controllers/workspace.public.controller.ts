import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { EnumRequestThrottleRoute } from '@common/request/enums/request.enum';
import { RequestRequiredStringSchema } from '@common/request/validations/request.required-string.validation';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import {
    WorkspacePublicInvitePreviewDoc,
    WorkspacePublicPreviewDoc,
} from '@modules/workspace/docs/workspace.public.doc';
import { WorkspaceInvitePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspacePreviewResponseSchema } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import { WorkspaceHttpService } from '@modules/workspace/services/workspace.http.service';
import { WorkspaceInviteHttpService } from '@modules/workspace/services/workspace.invite.http.service';
import { Controller, Get, Param } from '@nestjs/common';
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

    @WorkspacePublicInvitePreviewDoc()
    @Response('workspace.invite.preview', {
        schema: WorkspaceInvitePreviewResponseSchema,
    })
    @FeatureFlagProtected('workspace')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.moderate })
    @Get('/invite/:inviteToken/preview')
    async invitePreview(
        @Param('inviteToken', { schema: RequestRequiredStringSchema })
        inviteToken: string
    ): Promise<IResponseReturn<WorkspaceInvitePreviewResponseDto>> {
        return this.workspaceInviteHttpService.previewInvite(inviteToken);
    }

    @WorkspacePublicPreviewDoc()
    @Response('workspace.preview', {
        schema: WorkspacePreviewResponseSchema,
    })
    @FeatureFlagProtected('workspace')
    @ApiKeyProtected()
    @RequestThrottle({ route: EnumRequestThrottleRoute.moderate })
    @Get('/preview/:slug')
    async preview(
        @Param('slug', { schema: RequestRequiredStringSchema })
        slug: string
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceHttpService.previewWorkspace(slug);
    }
}
