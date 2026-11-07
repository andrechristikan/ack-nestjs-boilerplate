import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyDeleteByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.delete-by-admin.use-case';

describe('TermPolicyDeleteByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
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

    let useCase: TermPolicyDeleteByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(timestamp);
        helperDateService.formatToIso.mockImplementation((date: Date) =>
            date.toISOString()
        );
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(preparedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyDeleteByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(TermPolicyDeleteByAdminUseCase);
    });

    describe('execute', () => {
        it('wraps the deleted term policy and stages the delete activity log', async () => {
            termPolicyService.deleteByAdmin.mockResolvedValue(termPolicy);

            const result = await useCase.execute('term-policy-1');

            expect(result).toEqual({ data: termPolicy });
            expect(termPolicyService.deleteByAdmin).toHaveBeenCalledWith(
                'term-policy-1'
            );
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                termPolicy,
                timestamp
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyDelete,
                metadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });

        it('stages nothing when the domain rejects', async () => {
            const error = new TermPolicyNotFoundException();
            termPolicyService.deleteByAdmin.mockRejectedValue(error);

            await expect(useCase.execute('term-policy-1')).rejects.toBe(error);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
