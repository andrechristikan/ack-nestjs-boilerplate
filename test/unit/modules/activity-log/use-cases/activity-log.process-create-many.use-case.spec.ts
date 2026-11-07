import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { UserAgent } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumActivityLogProcess } from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { buildQueueJob } from '@test/unit/helpers/test.unit.queue.helper';
import { MessageService } from '@common/message/services/message.service';
import { ActivityLogProcessCreateManyUseCase } from '@modules/activity-log/use-cases/activity-log.process-create-many.use-case';

describe('ActivityLogProcessCreateManyUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

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
    const payload: IActivityLogCreateManyPayload = {
        rows: [
            {
                id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                userId: 'user-1',
                createdBy: 'user-1',
                workspaceId: null,
                action: EnumActivityLogAction.userLoginCredential,
                description: 'User login with credential',
                requestLog,
                metadata: {},
                createdAt: '2026-01-01T00:00:00.000Z',
            },
        ],
    };
    let useCase: ActivityLogProcessCreateManyUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: MessageService, useValue: messageService },
                ActivityLogProcessCreateManyUseCase,
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(ActivityLogProcessCreateManyUseCase);
    });

    describe('execute', () => {
        it('passes the rows with a date createdAt to the domain and reports the count', async () => {
            helperDateService.createFromIso.mockReturnValue(createdAt);
            const job = buildQueueJob<
                IActivityLogCreateManyPayload,
                unknown,
                EnumActivityLogProcess
            >(payload);

            const result = await useCase.execute(job);

            expect(helperDateService.createFromIso).toHaveBeenCalledWith(
                '2026-01-01T00:00:00.000Z'
            );
            expect(activityLogService.createMany).toHaveBeenCalledWith([
                { ...payload.rows[0], createdAt },
            ]);
            expect(result).toEqual({
                message: 'activityLog.queue.createMany',
                countRows: 1,
            });
        });

        it('rethrows the domain failure so BullMQ retries the job', async () => {
            const failure = new Error('database down');
            helperDateService.createFromIso.mockReturnValue(createdAt);
            activityLogService.createMany.mockRejectedValue(failure);
            const job = buildQueueJob<
                IActivityLogCreateManyPayload,
                unknown,
                EnumActivityLogProcess
            >(payload);

            const rejection = useCase.execute(job);

            await expect(rejection).rejects.toBe(failure);
        });
    });
});
