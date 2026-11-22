import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagRemoveTargetUserByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.remove-target-user-by-admin.use-case';

describe('FeatureFlagRemoveTargetUserByAdminUseCase', () => {
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    let useCase: FeatureFlagRemoveTargetUserByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagRemoveTargetUserByAdminUseCase,
                { provide: FeatureFlagService, useValue: featureFlagService },
            ],
        }).compile();
        useCase = module.get(FeatureFlagRemoveTargetUserByAdminUseCase);
    });

    describe('execute', () => {
        it('passes the target user to the service and returns the updated flag', async () => {
            const flag: IFeatureFlag = {
                id: '01920000-0000-7000-8000-6cd799439011',
                key: 'loginWithGoogle',
                description: 'Google login',
                isEnable: true,
                rolloutPercent: 50,
                targetUserIds: [],
                metadata: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            featureFlagService.removeTargetUserByAdmin.mockResolvedValue(flag);

            const result = await useCase.execute('flag-1', 'user-1');

            expect(result).toEqual({ data: flag });
            expect(
                featureFlagService.removeTargetUserByAdmin
            ).toHaveBeenCalledWith('flag-1', 'user-1');
        });
    });
});
