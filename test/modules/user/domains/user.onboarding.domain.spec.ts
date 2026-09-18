import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type { IUserSignUpWorkspacePersonal } from '@modules/user/interfaces/user.interface';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';

describe('UserOnboardingDomain', () => {
    const activityLogUtil = {
        buildCreateManyUserData:
            vi.fn<ActivityLogUtil['buildCreateManyUserData']>(),
    } satisfies Pick<ActivityLogUtil, 'buildCreateManyUserData'>;
    const databaseUtil = createMock<DatabaseUtil>();
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
    } satisfies Pick<HelperDateService, 'create'>;
    const helperStringService = createMock<HelperStringService>();
    const configService = new ConfigService({
        'workspace.personalNamePattern': '{username} workspace',
        'workspace.slugPrefix': 'ws',
        'workspace.slugMaxLength': 12,
        'workspace.slugMaxAttempts': 2,
    });
    const userRepository = createMock<UserRepository>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const personalContext = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-id',
        slugCandidates: ['slug-a', 'slug-b'],
        name: 'alice workspace',
    } satisfies IUserSignUpWorkspacePersonal;

    let service: UserOnboardingDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        databaseUtil.createId.mockReturnValue('workspace-id');
        helperStringService.generateSlug
            .mockReturnValueOnce('slug-a')
            .mockReturnValueOnce('slug-b');
        helperDateService.create.mockReturnValue(now);
        activityLogUtil.buildCreateManyUserData.mockImplementation(
            (_actorId, workspaceId, action) => ({
                action,
                workspaceId,
                description: `activityLog.${action}`,
                createdBy: 'actor-id',
                userAgent: {},
            })
        );

        service = new UserOnboardingDomain(
            userRepository,
            databaseUtil,
            helperStringService,
            configService
        );
    });

    it('builds personal workspace contexts with configured names and slug candidates', () => {
        expect(service.buildPersonalWorkspaceContexts(['alice'])).toEqual([
            personalContext,
        ]);
        expect(helperStringService.generateSlug).toHaveBeenCalledWith('ws', 12);
        expect(helperStringService.generateSlug).toHaveBeenCalledTimes(2);
    });

    it('builds sign-up activity logs including the verification-email request and workspace creation', () => {
        const logs = service.buildOnboardingActivities(
            EnumUserCreateMode.signUp,
            personalContext
        );

        expect(logs).toEqual([
            expect.objectContaining({
                action: EnumActivityLogAction.userSignedUp,
            }),
            expect.objectContaining({
                action: EnumActivityLogAction.userSendVerificationEmail,
            }),
            expect.objectContaining({
                action: EnumActivityLogAction.workspaceCreated,
                workspaceId: personalContext.workspaceId,
            }),
        ]);
    });
});
