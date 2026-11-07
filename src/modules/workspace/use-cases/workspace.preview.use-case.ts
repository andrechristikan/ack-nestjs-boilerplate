import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspacePreviewUseCase implements IAppUseCase<
    [string],
    IResponseReturn<Workspace>
> {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly featureFlagService: FeatureFlagService
    ) {}

    async execute(slug: string): Promise<IResponseReturn<Workspace>> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.joinRequestAllowed
        );
        const workspace = await this.workspaceService.previewWorkspace(slug);

        return { data: workspace };
    }
}
