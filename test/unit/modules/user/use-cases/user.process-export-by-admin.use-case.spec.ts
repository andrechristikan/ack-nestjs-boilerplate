import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import type {
    IAwsS3,
    IAwsS3Presign,
} from '@common/aws/interfaces/aws.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { FileService } from '@common/file/services/file.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { FileExceedMaxDataExportException } from '@common/file/exceptions/file.exceed-max-data-export.exception';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type {
    IActivityLogActorPayload,
    IActivityLogCreateManyEffect,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumAwsS3Accessibility,
    EnumActivityLogAction,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import type { IUserExportByAdminPayload } from '@modules/user/interfaces/user.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserProcessExportByAdminUseCase } from '@modules/user/use-cases/user.process-export-by-admin.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import {
    buildRequestLog,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserProcessExportByAdminUseCase', () => {
    const userImportService: MockProxy<UserImportService> =
        mock<UserImportService>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const tx = {} as IDatabaseTransactionClient;
    let useCase: UserProcessExportByAdminUseCase;

    const configValues: Record<string, unknown> = {
        ...TestUnitUserConfigValues,
        'aws.s3.temporaryPath': 'temporary',
        'user.export.pathPattern':
            '{temporaryPath}/exports/users/{outboxId}.csv',
        'user.export.presignExpiresInSeconds': 86400,
    };
    const activityLog: IActivityLogActorPayload = {
        apiKeyId: 'api-key-1',
        actorUserId: 'admin-quill',
        workspaceId: null,
        requestLog: buildRequestLog(),
    };
    const payload: IUserExportByAdminPayload = {
        status: [EnumUserStatus.active],
        roleId: 'role-quill',
        countryId: null,
        activityLog,
        exported: null,
    };
    const key = 'temporary/exports/users/outbox-quill.csv';
    const stored: IAwsS3 = {
        bucket: 'private-bucket',
        key,
        cdnUrl: null,
        completedUrl: 'https://private-bucket.example.com/' + key,
        mime: 'text/csv',
        extension: 'csv',
        size: 8,
        access: EnumAwsS3Accessibility.private,
    };
    const presign: IAwsS3Presign = {
        key,
        mime: 'text/csv',
        extension: 'csv',
        presignUrl: 'https://signed.example.com/export.csv',
        expiredInSeconds: 86400,
    };
    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.userExportResult,
            context: {
                userId: 'entry',
                proceedBy: 'entry',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'notify',
    };
    const activityEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'activity',
    };
    const exportedUser = {
        ...buildUser('user-quill', 'quill@example.com'),
        photo: null,
    };

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
        messageService.setMessage.mockImplementation((path: string) => path);
        userImportService.exportByAdmin.mockResolvedValue([exportedUser]);
        fileService.writeCsv.mockReturnValue('id;email');
        awsS3Service.putItem.mockResolvedValue(stored);
        awsS3Service.presignGetItem.mockResolvedValue(presign);
        notificationQueue.notify.mockReturnValue(notifyEffect);
        activityLogQueue.recordEffectFromPayload.mockReturnValue(
            activityEffect
        );
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProcessExportByAdminUseCase,
                { provide: UserImportService, useValue: userImportService },
                { provide: FileService, useValue: fileService },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: MessageService, useValue: messageService },
                HelperStringService,
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        useCase = module.get(UserProcessExportByAdminUseCase);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('execute', () => {
        it('puts the csv at the temporary export key in the private bucket with forceUpdate', async () => {
            await useCase.execute('outbox-quill', payload);

            expect(userImportService.exportByAdmin).toHaveBeenCalledWith(
                [EnumUserStatus.active],
                'role-quill',
                null
            );
            expect(awsS3Service.putItem).toHaveBeenCalledWith(
                { key, file: Buffer.from('id;email'), size: 8 },
                { access: EnumAwsS3Accessibility.private, forceUpdate: true }
            );
        });

        it('presigns the key for the configured duration', async () => {
            await useCase.execute('outbox-quill', payload);

            expect(awsS3Service.presignGetItem).toHaveBeenCalledWith(key, {
                access: EnumAwsS3Accessibility.private,
                expiredInSeconds: 86400,
            });
        });

        it('adds the notification and the activity entry and records exported in one transaction, then answers', async () => {
            const response = await useCase.execute('outbox-quill', payload);

            expect(response).toEqual({
                message: 'user.queue.exportByAdmin',
                exported: 1,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.userExportResult,
                {
                    userId: 'admin-quill',
                    proceedBy: 'admin-quill',
                    reference: 'outbox-quill',
                    link: 'https://signed.example.com/export.csv',
                    count: 1,
                    expiredAt: '2026-03-02T00:00:00.000Z',
                }
            );
            expect(
                activityLogQueue.recordEffectFromPayload
            ).toHaveBeenCalledWith(activityLog, {
                action: EnumActivityLogAction.adminUserExported,
                metadata: { count: 1 },
            });
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                notifyEffect,
                activityEffect,
            ]);
            expect(outboxService.updateDataInTx).toHaveBeenCalledWith(
                tx,
                'outbox-quill',
                { exported: 1 }
            );
        });

        it('returns the recorded count and calls nothing when exported is set', async () => {
            const response = await useCase.execute('outbox-quill', {
                ...payload,
                exported: 4,
            });

            expect(response).toEqual({
                message: 'user.queue.exportByAdmin',
                exported: 4,
            });
            expect(userImportService.exportByAdmin).not.toHaveBeenCalled();
            expect(awsS3Service.putItem).not.toHaveBeenCalled();
            expect(awsS3Service.presignGetItem).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws a fatal QueueException and opens no transaction when putItem rejects', async () => {
            awsS3Service.putItem.mockRejectedValue(new Error('s3'));

            const attempt = useCase.execute('outbox-quill', payload);

            await expect(attempt).rejects.toBeInstanceOf(QueueException);
            await expect(attempt).rejects.toMatchObject({
                message: 'user.queue.error.exportFailed',
                isFatal: true,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws a fatal QueueException and opens no transaction when putItem returns null', async () => {
            awsS3Service.putItem.mockResolvedValue(null);

            const attempt = useCase.execute('outbox-quill', payload);

            await expect(attempt).rejects.toBeInstanceOf(QueueException);
            await expect(attempt).rejects.toMatchObject({
                message: 'user.queue.error.exportFailed',
                isFatal: true,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws a fatal QueueException and opens no transaction when presignGetItem returns null', async () => {
            awsS3Service.presignGetItem.mockResolvedValue(null);

            const attempt = useCase.execute('outbox-quill', payload);

            await expect(attempt).rejects.toBeInstanceOf(QueueException);
            await expect(attempt).rejects.toMatchObject({
                message: 'user.queue.error.exportFailed',
                isFatal: true,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws a fatal QueueException and opens no transaction when the read rejects with a plain error', async () => {
            userImportService.exportByAdmin.mockRejectedValue(new Error('db'));

            const attempt = useCase.execute('outbox-quill', payload);

            await expect(attempt).rejects.toBeInstanceOf(QueueException);
            await expect(attempt).rejects.toMatchObject({
                message: 'user.queue.error.exportFailed',
                isFatal: true,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException from the read as is', async () => {
            const failure = new FileExceedMaxDataExportException();
            userImportService.exportByAdmin.mockRejectedValue(failure);

            await expect(useCase.execute('outbox-quill', payload)).rejects.toBe(
                failure
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });
});
