import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import { FeatureFlagInvalidMetadataException } from '@modules/feature-flag/exceptions/feature-flag.invalid-metadata.exception';
import { FeatureFlagNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.not-found.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { FeatureFlagUpdateMetadataByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.update-metadata-by-admin.use-case';

describe('FeatureFlagUpdateMetadataByAdminUseCase', () => {
    const featureFlagService: MockProxy<FeatureFlagService> =
        mock<FeatureFlagService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    let useCase: FeatureFlagUpdateMetadataByAdminUseCase;

    const featureFlag: IFeatureFlag = {
        id: '507f1f77bcf86cd799439011',
        key: 'loginWithGoogle',
        description: 'Enables Google sign-in',
        isEnable: true,
        rolloutPercent: 100,
        targetUserIds: [],
        metadata: { enabled: false },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const body: FeatureFlagUpdateMetadataRequestDto = {
        metadata: { enabled: true },
    };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagUpdateMetadataByAdminUseCase,
                { provide: FeatureFlagService, useValue: featureFlagService },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();

        useCase = module.get(FeatureFlagUpdateMetadataByAdminUseCase);
    });

    describe('execute', () => {
        it('throws FeatureFlagNotFoundException before any transaction opens', async () => {
            featureFlagService.getOneById.mockRejectedValue(
                new FeatureFlagNotFoundException()
            );

            await expect(
                useCase.execute(featureFlag.id, body)
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.notFound,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                featureFlagService.updateMetadataByAdminInTx
            ).not.toHaveBeenCalled();
        });

        it('throws FeatureFlagInvalidMetadataException before any transaction opens', async () => {
            featureFlagService.getOneById.mockResolvedValue(featureFlag);
            featureFlagService.assertMetadataValid.mockImplementation(() => {
                throw new FeatureFlagInvalidMetadataException();
            });

            await expect(
                useCase.execute(featureFlag.id, body)
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.invalidMetadata,
            });
            expect(featureFlagService.assertMetadataValid).toHaveBeenCalledWith(
                featureFlag,
                body
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('updates the metadata on the transaction tx and wraps the flag in the envelope', async () => {
            const updated = { ...featureFlag, metadata: { enabled: true } };
            featureFlagService.getOneById.mockResolvedValue(featureFlag);
            featureFlagService.updateMetadataByAdminInTx.mockResolvedValue(
                updated
            );

            const result = await useCase.execute(featureFlag.id, body);

            expect(result).toEqual({ data: updated });
            expect(featureFlagService.getOneById).toHaveBeenCalledWith(
                featureFlag.id
            );
            expect(
                featureFlagService.updateMetadataByAdminInTx
            ).toHaveBeenCalledWith(tx, featureFlag.id, body);
        });
    });
});
