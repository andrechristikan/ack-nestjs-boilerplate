import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagUpdateStatusByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.update-status-by-admin.use-case';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserService } from '@modules/user/services/user.service';

describe('FeatureFlagUpdateStatusByAdminUseCase', () => {
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    let useCase: FeatureFlagUpdateStatusByAdminUseCase;

    const featureFlag: IFeatureFlag = {
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
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userService.assertAllExist.mockResolvedValue();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagUpdateStatusByAdminUseCase,
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();

        useCase = module.get(FeatureFlagUpdateStatusByAdminUseCase);
    });

    describe('execute', () => {
        it('rejects with UserNotFoundException and opens no transaction when an id is unknown', async () => {
            const body: FeatureFlagUpdateStatusRequestDto = {
                isEnable: true,
                rolloutPercent: 50,
                targetUserIds: ['507f1f77bcf86cd799439012'],
            };
            const error = new UserNotFoundException();
            userService.assertAllExist.mockRejectedValue(error);

            await expect(
                useCase.execute('507f1f77bcf86cd799439011', body)
            ).rejects.toBe(error);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                featureFlagService.updateStatusByAdminInTx
            ).not.toHaveBeenCalled();
        });

        it('updates the status on the transaction tx with the distinct ids and wraps the flag in the envelope', async () => {
            const body: FeatureFlagUpdateStatusRequestDto = {
                isEnable: false,
                rolloutPercent: 0,
                targetUserIds: ['a', 'a', 'b'],
            };
            const updated: IFeatureFlag = {
                ...featureFlag,
                isEnable: false,
                rolloutPercent: 0,
                targetUserIds: ['a', 'b'],
            };
            featureFlagService.updateStatusByAdminInTx.mockResolvedValue(
                updated
            );

            const result = await useCase.execute(
                '507f1f77bcf86cd799439011',
                body
            );

            expect(result).toEqual({ data: updated });
            expect(userService.assertAllExist).toHaveBeenCalledWith(['a', 'b']);
            expect(
                featureFlagService.updateStatusByAdminInTx
            ).toHaveBeenCalledWith(tx, '507f1f77bcf86cd799439011', {
                isEnable: false,
                rolloutPercent: 0,
                targetUserIds: ['a', 'b'],
            });
        });

        it('passes an empty target list through as an empty list', async () => {
            const body: FeatureFlagUpdateStatusRequestDto = {
                isEnable: true,
                rolloutPercent: 100,
                targetUserIds: [],
            };
            featureFlagService.updateStatusByAdminInTx.mockResolvedValue(
                featureFlag
            );

            await useCase.execute('507f1f77bcf86cd799439011', body);

            expect(userService.assertAllExist).toHaveBeenCalledWith([]);
            expect(
                featureFlagService.updateStatusByAdminInTx
            ).toHaveBeenCalledWith(tx, '507f1f77bcf86cd799439011', {
                isEnable: true,
                rolloutPercent: 100,
                targetUserIds: [],
            });
        });
    });
});
