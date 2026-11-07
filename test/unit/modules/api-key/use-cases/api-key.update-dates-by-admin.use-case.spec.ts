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
import type { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { ApiKeyUpdateDatesByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-dates-by-admin.use-case';

describe('ApiKeyUpdateDatesByAdminUseCase', () => {
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

    let useCase: ApiKeyUpdateDatesByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyUpdateDatesByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ApiKeyUpdateDatesByAdminUseCase);
    });

    describe('execute', () => {
        it('updates the date window and wraps the result', async () => {
            const startAt = new Date('2026-02-01T00:00:00.000Z');
            const endAt = new Date('2026-03-01T00:00:00.000Z');
            const body: ApiKeyUpdateDateRequestDto = { startAt, endAt };
            const updated: ApiKey = { ...apiKey, startAt, endAt };
            apiKeyService.updateDatesByAdmin.mockResolvedValue(updated);

            const result = await useCase.execute(apiKey.id, body);

            expect(result).toEqual({ data: updated });
            expect(apiKeyService.updateDatesByAdmin).toHaveBeenCalledWith(
                apiKey.id,
                startAt,
                endAt
            );
        });

        it('prepares the date activity log from the updated key and stages it after the write', async () => {
            const startAt = new Date('2026-02-01T00:00:00.000Z');
            const endAt = new Date('2026-03-01T00:00:00.000Z');
            const updated: ApiKey = { ...apiKey, startAt, endAt };
            apiKeyService.updateDatesByAdmin.mockResolvedValue(updated);

            await useCase.execute(apiKey.id, { startAt, endAt });

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                updated,
                now
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminApiKeyUpdateDate,
                metadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
