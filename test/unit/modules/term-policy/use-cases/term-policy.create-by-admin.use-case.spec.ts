import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { TermPolicyDefaultType } from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyCreateByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.create-by-admin.use-case';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';

describe('TermPolicyCreateByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const termPolicy: TermPolicy = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        contents: [],
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
    };
    const metadata = {
        termPolicyId: 'term-policy-1',
        termPolicyType: EnumTermPolicyType.privacy,
        termPolicyVersion: 1,
        timestamp,
    };
    const preparedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminTermPolicyCreate,
        metadata,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    let useCase: TermPolicyCreateByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(timestamp);
        helperDateService.formatToIso.mockImplementation((date: Date) =>
            date.toISOString()
        );
        databaseUtil.createId.mockReturnValue('term-policy-1');
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(preparedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyCreateByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(TermPolicyCreateByAdminUseCase);
    });

    describe('execute', () => {
        it('prepares the create activity log before the write and stages it after', async () => {
            const calls: string[] = [];
            const body: TermPolicyCreateRequestDto = {
                type: TermPolicyDefaultType[0]!,
                version: 1,
                contents: [],
            };
            activityLogService.prepare.mockImplementation(() => {
                calls.push('prepare');

                return preparedActivityLog;
            });
            termPolicyService.createByAdmin.mockImplementation(async () => {
                calls.push('create');

                return termPolicy;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            const result = await useCase.execute(body);

            expect(result).toEqual({ data: termPolicy });
            expect(calls).toEqual(['prepare', 'create', 'stage']);
            expect(termPolicyService.createByAdmin).toHaveBeenCalledWith(
                'term-policy-1',
                body
            );
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                { id: 'term-policy-1', type: body.type, version: 1 },
                timestamp
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyCreate,
                metadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });

        it('stages nothing when the domain rejects', async () => {
            const error = new Error('create failed');
            termPolicyService.createByAdmin.mockRejectedValue(error);

            const promise = useCase.execute({
                type: TermPolicyDefaultType[0]!,
                version: 1,
                contents: [],
            });

            await expect(promise).rejects.toBe(error);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
