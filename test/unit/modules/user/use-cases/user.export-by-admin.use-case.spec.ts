import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserStatus } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { FileExceedMaxDataExportException } from '@common/file/exceptions/file.exceed-max-data-export.exception';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import type { IUserExportByAdminEffect } from '@modules/user/interfaces/user.interface';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserExportByAdminUseCase } from '@modules/user/use-cases/user.export-by-admin.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserExportByAdminUseCase', () => {
    const userQueue: MockProxy<UserQueue> = mock<UserQueue>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const userImportService: MockProxy<UserImportService> =
        mock<UserImportService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = mock<IDatabaseTransactionClient>();
    let useCase: UserExportByAdminUseCase;

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('admin-fable');
    const activityLog: IActivityLogActorPayload = {
        apiKeyId: apiKeyContext.apiKey.id,
        actorUserId: authContext.userId,
        workspaceId: null,
        requestLog: requestContext.requestLog,
    };
    const exportEffect: IUserExportByAdminEffect = {
        queue: EnumUserQueue.user,
        name: EnumUserProcess.exportByAdmin,
        data: {
            status: [EnumUserStatus.active],
            roleId: 'role-fable',
            countryId: 'country-fable',
            activityLog,
            exported: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: null,
    };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        outboxService.addInTx.mockResolvedValue('outbox-fable');
        activityLogQueue.toPayload.mockReturnValue(activityLog);
        userQueue.exportByAdminEffect.mockReturnValue(exportEffect);
        userImportService.resolveExportByAdminStatus.mockReturnValue(
            UserDefaultStatus
        );
        userImportService.assertExportByAdminWithinCap.mockResolvedValue();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserExportByAdminUseCase,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: UserQueue, useValue: userQueue },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: UserImportService, useValue: userImportService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();
        useCase = module.get(UserExportByAdminUseCase);
    });

    describe('execute', () => {
        const query: UserExportRequestDto = {};

        it('adds one export effect in one transaction and returns the outbox id', async () => {
            userImportService.resolveExportByAdminStatus.mockReturnValue([
                EnumUserStatus.active,
            ]);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    status: EnumUserStatus.active,
                    roleId: 'role-fable',
                    countryId: 'country-fable',
                }
            );

            expect(result).toEqual({ data: { outboxId: 'outbox-fable' } });
            expect(
                userImportService.resolveExportByAdminStatus
            ).toHaveBeenCalledWith({
                status: { in: [EnumUserStatus.active] },
            });
            expect(
                userImportService.assertExportByAdminWithinCap
            ).toHaveBeenCalledWith(
                [EnumUserStatus.active],
                'role-fable',
                'country-fable'
            );
            expect(activityLogQueue.toPayload).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null
            );
            expect(userQueue.exportByAdminEffect).toHaveBeenCalledWith(
                [EnumUserStatus.active],
                'role-fable',
                'country-fable',
                activityLog
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                exportEffect
            );
        });

        it('queues every status and no role or country when the query has no filter', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                query
            );

            expect(
                userImportService.resolveExportByAdminStatus
            ).toHaveBeenCalledWith(null);
            expect(userQueue.exportByAdminEffect).toHaveBeenCalledWith(
                UserDefaultStatus,
                null,
                null,
                activityLog
            );
        });

        it('throws AwsS3NotConfiguredException, counts nothing and opens no transaction', async () => {
            userImportService.assertExportByAdminDeliverable.mockImplementation(
                () => {
                    throw new AwsS3NotConfiguredException();
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    query
                )
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
            expect(
                userImportService.assertExportByAdminWithinCap
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws AwsSesNotConfiguredException, counts nothing and opens no transaction', async () => {
            userImportService.assertExportByAdminDeliverable.mockImplementation(
                () => {
                    throw new AwsSesNotConfiguredException();
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    query
                )
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(
                userImportService.assertExportByAdminWithinCap
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws FileExceedMaxDataExportException and opens no transaction', async () => {
            userImportService.assertExportByAdminWithinCap.mockRejectedValue(
                new FileExceedMaxDataExportException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    query
                )
            ).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.exceedMaxDataExport,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws PaginationFilterInvalidValueEnumException on an invalid status before any check', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, {
                    status: 'not-a-status',
                })
            ).rejects.toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.filterInvalidValue,
            });
            expect(
                userImportService.assertExportByAdminDeliverable
            ).not.toHaveBeenCalled();
            expect(
                userImportService.assertExportByAdminWithinCap
            ).not.toHaveBeenCalled();
        });
    });
});
