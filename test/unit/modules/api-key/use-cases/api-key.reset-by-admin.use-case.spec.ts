import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
} from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { ApiKeyResetByAdminUseCase } from '@modules/api-key/use-cases/api-key.reset-by-admin.use-case';

describe('ApiKeyResetByAdminUseCase', () => {
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const apiKeyUtil: MockProxy<ApiKeyUtil> = mock<ApiKeyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const apiKey: ApiKey = {
        id: 'api-key-1',
        name: 'Acme Api Key',
        type: EnumApiKeyType.default,
        key: 'local_abc123',
        hash: 'hashed-secret',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const metadata = { apiKeyId: apiKey.id };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminApiKeyCreate,
        metadata,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    let useCase: ApiKeyResetByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyResetByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ApiKeyResetByAdminUseCase);
    });

    describe('execute', () => {
        it('resets the secret and shapes the secret-bearing response', async () => {
            apiKeyService.resetByAdmin.mockResolvedValue({
                apiKey,
                secret: 'new-secret',
            });
            const reset = { ...apiKey, secret: 'new-secret' };
            apiKeyUtil.mapCreate.mockReturnValue(reset);

            const result = await useCase.execute(apiKey.id);

            expect(result).toEqual({ data: reset });
            expect(apiKeyService.resetByAdmin).toHaveBeenCalledWith(apiKey.id);
            expect(apiKeyUtil.mapCreate).toHaveBeenCalledWith(
                apiKey,
                'new-secret'
            );
        });

        it('prepares the reset activity log from the reset key and stages it after the write', async () => {
            apiKeyService.resetByAdmin.mockResolvedValue({
                apiKey,
                secret: 'new-secret',
            });
            apiKeyUtil.mapCreate.mockReturnValue({
                ...apiKey,
                secret: 'new-secret',
            });

            await useCase.execute(apiKey.id);

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                apiKey,
                now
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyReset,
                metadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
