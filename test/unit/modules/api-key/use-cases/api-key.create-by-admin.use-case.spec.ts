import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumApiKeyType,
} from '@generated/prisma-client/client';
import type { ApiKey } from '@generated/prisma-client/client';
import type { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyUtil } from '@modules/api-key/utils/api-key.util';
import { ApiKeyCreateByAdminUseCase } from '@modules/api-key/use-cases/api-key.create-by-admin.use-case';

describe('ApiKeyCreateByAdminUseCase', () => {
    const apiKeyService: MockProxy<ApiKeyService> = mock<ApiKeyService>();
    const apiKeyUtil: MockProxy<ApiKeyUtil> = mock<ApiKeyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
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

    let useCase: ApiKeyCreateByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        apiKeyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyCreateByAdminUseCase,
                { provide: ApiKeyService, useValue: apiKeyService },
                { provide: ApiKeyUtil, useValue: apiKeyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ApiKeyCreateByAdminUseCase);
    });

    describe('execute', () => {
        it('creates the api key and shapes the secret-bearing response', async () => {
            const body: ApiKeyCreateRequestDto = {
                name: 'Acme Api Key',
                type: EnumApiKeyType.default,
            };
            apiKeyService.createByAdmin.mockResolvedValue({
                apiKey,
                secret: 'plain-secret',
            });
            const created = { ...apiKey, secret: 'plain-secret' };
            apiKeyUtil.mapCreate.mockReturnValue(created);
            databaseUtil.createId.mockReturnValue(apiKey.id);

            const result = await useCase.execute(body);

            expect(result).toEqual({ data: created });
            expect(apiKeyService.createByAdmin).toHaveBeenCalledWith(
                apiKey.id,
                {
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                    startAt: null,
                    endAt: null,
                }
            );
            expect(apiKeyUtil.mapCreate).toHaveBeenCalledWith(
                apiKey,
                'plain-secret'
            );
        });

        it('prepares the create activity log with the drawn id before the write and stages it after', async () => {
            const body: ApiKeyCreateRequestDto = {
                name: 'Acme Api Key',
                type: EnumApiKeyType.default,
            };
            databaseUtil.createId.mockReturnValue(apiKey.id);
            apiKeyService.createByAdmin.mockImplementation(async () => {
                expect(activityLogService.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.adminApiKeyCreate,
                    metadata,
                });
                expect(activityLogService.stagePrepared).not.toHaveBeenCalled();

                return { apiKey, secret: 'plain-secret' };
            });
            apiKeyUtil.mapCreate.mockReturnValue({
                ...apiKey,
                secret: 'plain-secret',
            });

            await useCase.execute(body);

            expect(apiKeyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                {
                    id: apiKey.id,
                    name: 'Acme Api Key',
                    type: EnumApiKeyType.default,
                },
                now
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            const body: ApiKeyCreateRequestDto = {
                name: 'Acme Api Key',
                type: EnumApiKeyType.default,
            };
            databaseUtil.createId.mockReturnValue(apiKey.id);
            apiKeyService.createByAdmin.mockRejectedValue(new Error('boom'));

            await expect(useCase.execute(body)).rejects.toThrow('boom');
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
