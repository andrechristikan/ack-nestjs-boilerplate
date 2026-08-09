import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import {
    WorkspacePublicInvitePreviewDoc,
    WorkspacePublicPreviewDoc,
} from '@modules/workspace/docs/workspace.public.doc';
import { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import { WorkspacePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.preview.response.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.workspace')
@Controller({
    version: '1',
    path: '/workspace',
})
export class WorkspacePublicController {
    constructor(private readonly workspaceService: WorkspaceService) {}

    @WorkspacePublicInvitePreviewDoc()
    @Response('workspace.invite.preview')
    @FeatureFlagProtected('workspace')
    @ApiKeyProtected()
    @Get('/invite/:inviteToken')
    async invitePreview(
        @Param('inviteToken', RequestRequiredPipe)
        inviteToken: string
    ): Promise<IResponseReturn<WorkspaceInvitePreviewResponseDto>> {
        return this.workspaceService.previewInvite(inviteToken);
    }

    @WorkspacePublicPreviewDoc()
    @Response('workspace.preview')
    @FeatureFlagProtected('workspace')
    @ApiKeyProtected()
    @Get('/preview/:slug')
    async preview(
        @Param('slug', RequestRequiredPipe)
        slug: string
    ): Promise<IResponseReturn<WorkspacePreviewResponseDto>> {
        return this.workspaceService.previewWorkspace(slug);
    }
}
