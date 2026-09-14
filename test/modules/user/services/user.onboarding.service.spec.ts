import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingService } from '@modules/user/services/user.onboarding.service';

describe('UserOnboardingService', () => {
    const activityLogUtil = {
        buildCreateManyUserData:
            vi.fn<ActivityLogUtil['buildCreateManyUserData']>(),
    } satisfies Pick<ActivityLogUtil, 'buildCreateManyUserData'>;
    const databaseUtil = {
        createId: vi.fn<DatabaseUtil['createId']>(),
    } satisfies Pick<DatabaseUtil, 'createId'>;
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
    } satisfies Pick<HelperDateService, 'create'>;
    const helperStringService = {
        generateSlug: vi.fn<HelperStringService['generateSlug']>(),
    } satisfies Pick<HelperStringService, 'generateSlug'>;
    const configGet = vi.fn((_key: string): unknown => undefined);
    const configService = {
        get<T>(key: string): T | undefined {
            return configGet(key) as T | undefined;
        },
    } satisfies Pick<ConfigService, 'get'>;

    const now = new Date('2026-01-01T00:00:00.000Z');
    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const personalContext = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-id',
        slugCandidates: ['slug-a', 'slug-b'],
        name: 'alice workspace',
    } satisfies IUserSignUpWorkspacePersonal;
    const inviteContext = {
        type: EnumUserSignUpWorkspaceContextType.invite,
        workspaceId: 'workspace-id',
        workspaceInviteId: 'workspace-invite-id',
        workspaceMemberRole: EnumWorkspaceMemberRole.member,
        projectId: 'project-id',
        projectMemberRole: EnumProjectMemberRole.viewer,
    } satisfies IUserSignUpWorkspaceInvite;

    let service: UserOnboardingService;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values = {
                'workspace.personalNamePattern': '{username} workspace',
                'workspace.slugPrefix': 'ws',
                'workspace.slugMaxLength': 12,
                'workspace.slugMaxAttempts': 2,
            };

            return values[key as keyof typeof values];
        });
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
                UserOnboardingService,
                { provide: ActivityLogUtil, useValue: activityLogUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = moduleRef.get(UserOnboardingService);
    });

    it('builds personal workspace contexts with configured names and slug candidates', () => {
        expect(service.buildPersonalWorkspaceContexts(['alice'])).toEqual([
            personalContext,
        ]);
        expect(helperStringService.generateSlug).toHaveBeenCalledWith('ws', 12);
        expect(helperStringService.generateSlug).toHaveBeenCalledTimes(2);
    });

    it('builds sign-up activity logs including the verification-email request and workspace creation', () => {
        const logs = service.buildOnboardingActivityLogs(
            EnumUserCreateMode.signUp,
            personalContext,
            requestLog,
            'actor-id'
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

    it('builds personal workspace and owner member rows', () => {
        expect(
            service.buildWorkspaceRows('user-id', personalContext, 'actor-id')
        ).toEqual({
            workspace: {
                data: {
                    id: personalContext.workspaceId,
                    name: personalContext.name,
                    slug: personalContext.slugCandidates[0],
                    createdBy: 'actor-id',
                    deletedAt: null,
                },
            },
            workspaceMember: {
                data: {
                    workspaceId: personalContext.workspaceId,
                    userId: 'user-id',
                    role: EnumWorkspaceMemberRole.owner,
                    createdBy: 'actor-id',
                },
            },
            workspaceInvite: null,
            projectMember: null,
        });
    });

    it('builds invited workspace membership, invite acceptance, and project membership rows', () => {
        expect(
            service.buildWorkspaceRows('user-id', inviteContext, 'actor-id')
        ).toEqual({
            workspace: null,
            workspaceMember: {
                data: {
                    workspaceId: inviteContext.workspaceId,
                    userId: 'user-id',
                    role: EnumWorkspaceMemberRole.member,
                    createdBy: 'actor-id',
                },
            },
            workspaceInvite: {
                where: { id: inviteContext.workspaceInviteId },
                data: {
                    status: EnumWorkspaceInviteStatus.accepted,
                    acceptedAt: now,
                    acceptedByUserId: 'user-id',
                    updatedBy: 'actor-id',
                },
            },
            projectMember: {
                data: {
                    projectId: inviteContext.projectId,
                    userId: 'user-id',
                    role: EnumProjectMemberRole.viewer,
                    createdBy: 'actor-id',
                },
            },
        });
    });
});
