import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { FeatureFlag } from '@generated/prisma-client/client';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagUpdateMetadataByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.update-metadata-by-admin.use-case';

describe('FeatureFlagUpdateMetadataByAdminUseCase', () => {
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();

    let useCase: FeatureFlagUpdateMetadataByAdminUseCase;

    const featureFlag: FeatureFlag = {
        id: '507f1f77bcf86cd799439011',
        key: 'loginWithGoogle',
        description: 'Enables Google sign-in',
        isEnable: true,
        rolloutPercent: 100,
        targetUserIds: [],
        metadata: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagUpdateMetadataByAdminUseCase,
                { provide: FeatureFlagService, useValue: featureFlagService },
            ],
        }).compile();

        useCase = module.get(FeatureFlagUpdateMetadataByAdminUseCase);
    });

    describe('execute', () => {
        it('wraps the updated flag in the response envelope', async () => {
            const body: FeatureFlagUpdateMetadataRequestDto = {
                metadata: { enabled: true },
            };
            const updated = { ...featureFlag, metadata: { enabled: true } };
            featureFlagService.updateMetadataByAdmin.mockResolvedValue(updated);

            const result = await useCase.execute(
                '507f1f77bcf86cd799439011',
                body
            );

            expect(result).toEqual({ data: updated });
            expect(
                featureFlagService.updateMetadataByAdmin
            ).toHaveBeenCalledWith('507f1f77bcf86cd799439011', body);
        });
    });
});
