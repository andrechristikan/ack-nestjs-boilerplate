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
import { ApiKeyUpdateStatusByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-status-by-admin.use-case';

describe('ApiKeyUpdateStatusByAdminUseCase', () => {
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

    let useCase: ApiKeyUpdateStatusByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyUpdateStatusByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ApiKeyUpdateStatusByAdminUseCase);
    });

    describe('execute', () => {
        it('updates the status and wraps the result', async () => {
            const updated: ApiKey = { ...apiKey, isActive: false };
            apiKeyService.updateStatusByAdmin.mockResolvedValue(updated);

            const result = await useCase.execute(apiKey.id, {
                isActive: false,
            });

            expect(result).toEqual({ data: updated });
            expect(apiKeyService.updateStatusByAdmin).toHaveBeenCalledWith(
                apiKey.id,
                false
            );
        });

        it('prepares the status activity log from the updated key and stages it after the write', async () => {
            const updated: ApiKey = { ...apiKey, isActive: false };
            apiKeyService.updateStatusByAdmin.mockResolvedValue(updated);

            await useCase.execute(apiKey.id, { isActive: false });

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                updated,
                now
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyUpdateStatus,
                metadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
