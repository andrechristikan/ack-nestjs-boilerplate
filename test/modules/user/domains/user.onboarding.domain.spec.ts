import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';

describe('UserOnboardingDomain', () => {
    const activityLogUtil: MockProxy<ActivityLogUtil> = mock<ActivityLogUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const configValues: Record<string, unknown> = {
        'workspace.personalNamePattern': '{username} workspace',
        'workspace.slugPrefix': 'ws',
        'workspace.slugMaxLength': 12,
        'workspace.slugMaxAttempts': 2,
    };

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
        vi.mocked(configService.get).mockImplementation(
            (key: string) => configValues[key]
        );
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

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserOnboardingDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = moduleRef.get(UserOnboardingDomain);
    });

    it('builds personal workspace contexts with configured names and slug candidates', () => {
        const [context] = service.buildPersonalWorkspaceContexts(['alice']);

        expect(context.type).toBe(EnumUserSignUpWorkspaceContextType.personal);
        expect(context.workspaceId).toBe('workspace-id');
        expect(context.slugCandidates).toEqual(['slug-a', 'slug-b']);
        expect(context.name).toBe('alice workspace');
        expect(helperStringService.generateSlug).toHaveBeenCalledWith('ws', 12);
        expect(helperStringService.generateSlug).toHaveBeenCalledTimes(2);
    });

    it('builds sign-up activity logs including the verification-email request and workspace creation', () => {
        const logs = service.buildOnboardingActivities(
            EnumUserCreateMode.signUp,
            mock<IUserCreateWithWorkspaceInput>({
                userId: 'user-id',
                createdBy: 'user-id',
                workspaceContext: personalContext,
            }),
            mock<IUser>({ createdAt: now })
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
