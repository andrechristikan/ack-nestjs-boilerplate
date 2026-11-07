import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
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
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyRemoveContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.remove-content-by-admin.use-case';

describe('TermPolicyRemoveContentByAdminUseCase', () => {
    const termPolicyContentService: MockProxy<TermPolicyContentService> =
        mock<TermPolicyContentService>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const metadata = {
        termPolicyId: 'term-policy-1',
        termPolicyType: EnumTermPolicyType.privacy,
        termPolicyVersion: 1,
        timestamp,
    };
    const preparedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminTermPolicyUpdateContent,
        metadata,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const draftTermPolicy: TermPolicy = {
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

    let useCase: TermPolicyRemoveContentByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(timestamp);
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(preparedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyRemoveContentByAdminUseCase,
                {
                    provide: TermPolicyContentService,
                    useValue: termPolicyContentService,
                },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        useCase = module.get(TermPolicyRemoveContentByAdminUseCase);
    });

    describe('execute', () => {
        it('returns an empty response after removing the content', async () => {
            termPolicyContentService.removeContentByAdmin.mockResolvedValue(
                draftTermPolicy
            );

            const result = await useCase.execute('term-policy-1', {
                language: EnumMessageLanguage.en,
            });

            expect(result).toEqual({});
            expect(
                termPolicyContentService.removeContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', EnumMessageLanguage.en);
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                draftTermPolicy,
                timestamp
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyRemoveContent,
                metadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });
    });
});
