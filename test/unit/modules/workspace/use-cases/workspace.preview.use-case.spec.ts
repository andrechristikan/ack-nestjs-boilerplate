import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Workspace } from '@generated/prisma-client/client';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspacePreviewUseCase } from '@modules/workspace/use-cases/workspace.preview.use-case';

describe('WorkspacePreviewUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };
    let useCase: WorkspacePreviewUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspacePreviewUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: FeatureFlagService, useValue: featureFlagService },
            ],
        }).compile();

        useCase = module.get(WorkspacePreviewUseCase);
    });

    describe('execute', () => {
        it('gates on the join request flag then wraps the public workspace preview', async () => {
            const callOrder: string[] = [];
            featureFlagService.validateFeatureFlagMetadata.mockImplementation(
                async () => {
                    callOrder.push('gate');
                }
            );
            workspaceService.previewWorkspace.mockImplementation(async () => {
                callOrder.push('preview');

                return workspace;
            });

            const result = await useCase.execute('acme-team');

            expect(result).toEqual({ data: workspace });
            expect(
                featureFlagService.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith(
                EnumFeatureFlagKey.workspace,
                EnumFeatureFlagMetadataKey.joinRequestAllowed
            );
            expect(workspaceService.previewWorkspace).toHaveBeenCalledWith(
                'acme-team'
            );
            expect(callOrder).toEqual(['gate', 'preview']);
        });

        it('looks up nothing when the gate rejects', async () => {
            featureFlagService.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(useCase.execute('acme-team')).rejects.toBeInstanceOf(
                FeatureFlagDisabledException
            );
            expect(workspaceService.previewWorkspace).not.toHaveBeenCalled();
        });
    });
});
