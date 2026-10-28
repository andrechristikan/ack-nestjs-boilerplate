import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Queue } from 'bullmq';
import { SentryService } from '@common/sentry/services/sentry.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { UserAgent } from '@generated/prisma-client/client';
import { EnumActivityLogProcess } from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreate } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';

describe('ActivityLogQueue', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const activityLogQueue: MockProxy<Queue> = mock<Queue>();
    const sentryService: MockProxy<SentryService> = mock<SentryService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    const userAgent: UserAgent = {
        ua: null,
        browser: null,
        cpu: { architecture: null },
        device: { type: null, vendor: null, model: null },
        engine: { name: null, version: null },
        os: { name: null, version: null },
    };
    const requestLog: IRequestLog = {
        userAgent,
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const rows: IActivityLogCreate[] = [
        {
            id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
            userId: 'user-1',
            createdBy: 'user-1',
            workspaceId: null,
            action: EnumActivityLogAction.userLoginCredential,
            description: 'User login with credential',
            requestLog,
            metadata: {},
            createdAt,
        },
        {
            id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
            userId: 'user-1',
            createdBy: 'user-1',
            workspaceId: 'workspace-1',
            action: EnumActivityLogAction.userLogout,
            description: 'User logout',
            requestLog,
            metadata: {},
            createdAt,
        },
    ];

    let queue: ActivityLogQueue;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'activityLog.jobId.createManyPattern': '{process}-{nonce}',
            };

            return values[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                ActivityLogQueue,
                {
                    provide: getQueueToken(EnumQueue.activityLog),
                    useValue: activityLogQueue,
                },
                { provide: SentryService, useValue: sentryService },
                { provide: ConfigService, useValue: configService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();

        queue = module.get(ActivityLogQueue);
    });

    describe('createMany', () => {
        it('adds one job carrying every row with an iso createdAt under a fresh job id', async () => {
            databaseUtil.createId.mockReturnValue('nonce-1');
            helperStringService.fillPattern.mockReturnValue(
                'createMany-nonce-1'
            );
            helperDateService.formatToIso.mockReturnValue(
                '2026-01-01T00:00:00.000Z'
            );

            await queue.createMany(rows);

            const payloadRows = [
                { ...rows[0], createdAt: '2026-01-01T00:00:00.000Z' },
                { ...rows[1], createdAt: '2026-01-01T00:00:00.000Z' },
            ];

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{process}-{nonce}',
                {
                    process: EnumActivityLogProcess.createMany,
                    nonce: 'nonce-1',
                }
            );
            expect(activityLogQueue.add).toHaveBeenCalledTimes(1);
            expect(activityLogQueue.add).toHaveBeenCalledWith(
                EnumActivityLogProcess.createMany,
                { rows: payloadRows },
                {
                    priority: EnumQueuePriority.low,
                    jobId: 'createMany-nonce-1',
                }
            );
        });

        it('adds nothing when no row is given', async () => {
            await queue.createMany([]);

            expect(activityLogQueue.add).not.toHaveBeenCalled();
        });

        it('resolves and reports the failure when the add rejects', async () => {
            const error = new Error('redis down');
            databaseUtil.createId.mockReturnValue('nonce-1');
            helperStringService.fillPattern.mockReturnValue(
                'createMany-nonce-1'
            );
            helperDateService.formatToIso.mockReturnValue(
                '2026-01-01T00:00:00.000Z'
            );
            activityLogQueue.add.mockRejectedValue(error);

            await expect(queue.createMany(rows)).resolves.toBeUndefined();

            expect(sentryService.captureException).toHaveBeenCalledWith(
                expect.objectContaining({
                    rawError: error,
                    message: 'activityLog.queue.error.enqueueCreateMany',
                })
            );
        });
    });
});
