import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
import { TermPolicyPublishByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.publish-by-admin.use-case';

describe('TermPolicyPublishByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

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
    const publishedAt = new Date('2026-01-02T00:00:00.000Z');
    const updatedAt = new Date('2026-01-03T00:00:00.000Z');
    const publishedTermPolicy: TermPolicy = {
        ...termPolicy,
        status: EnumTermPolicyStatus.published,
        publishedAt,
        updatedAt,
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

    let useCase: TermPolicyPublishByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(preparedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyPublishByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
            ],
        }).compile();

        useCase = module.get(TermPolicyPublishByAdminUseCase);
    });

    describe('execute', () => {
        it('stages the publish activity log from the published row, with the actor', async () => {
            const calls: string[] = [];
            termPolicyService.publishByAdmin.mockImplementation(async () => {
                calls.push('publish');

                return publishedTermPolicy;
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            const result = await useCase.execute('term-policy-1', 'user-1');

            expect(result).toEqual({});
            expect(calls).toEqual(['publish', 'stage']);
            expect(termPolicyService.publishByAdmin).toHaveBeenCalledWith(
                'term-policy-1',
                'user-1'
            );
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                publishedTermPolicy,
                updatedAt
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyPublish,
                metadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });

        it('stages nothing when the domain rejects', async () => {
            const error = new TermPolicyNotFoundException();
            termPolicyService.publishByAdmin.mockRejectedValue(error);

            await expect(
                useCase.execute('term-policy-1', 'user-1')
            ).rejects.toBe(error);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
