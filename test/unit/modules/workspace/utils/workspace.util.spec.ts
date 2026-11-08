import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateWithWorkspaceInput } from '@modules/user/interfaces/user.interface';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceUtil', () => {
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let util: WorkspaceUtil;

    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };

    const invite: WorkspaceInvite = {
        id: 'invite-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        token: 'hashed-token',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    const personalInput: IUserCreateWithWorkspaceInput = {
        userId: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        username: 'alice',
        countryId: 'country-1',
        roleId: 'role-1',
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: false,
        verifiedAt: null,
        acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
        password: null,
        passwordHistoryType: null,
        verification: null,
        workspaceContext: {
            type: EnumUserSignUpWorkspaceContextType.personal,
            workspaceId: 'workspace-1',
            slugCandidates: ['slug-a', 'slug-b'],
            name: 'User One',
        },
        createdBy: 'user-1',
    };

    const inviteInput: IUserCreateWithWorkspaceInput = {
        ...personalInput,
        userId: 'user-2',
        workspaceContext: {
            type: EnumUserSignUpWorkspaceContextType.invite,
            workspaceId: 'workspace-1',
            workspaceInviteId: 'invite-1',
            invitedByUserId: 'user-1',
            workspaceMemberRole: EnumWorkspaceMemberRole.member,
            projectId: null,
            projectMemberRole: null,
        },
        createdBy: 'user-2',
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUtil,
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        util = module.get(WorkspaceUtil);
    });

    describe('mapInviteNotificationPayload', () => {
        it('maps the workspace, invite, and inviter name with an ISO expiry', () => {
            helperDateService.formatToIso.mockReturnValue(
                '2026-02-01T00:00:00.000Z'
            );

            const result = util.mapInviteNotificationPayload(
                workspace,
                invite,
                'Jane Doe'
            );

            expect(result).toEqual({
                workspaceId: 'workspace-1',
                workspaceName: 'Acme',
                inviterName: 'Jane Doe',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                reference: 'WIN-abc123',
                expiredAt: '2026-02-01T00:00:00.000Z',
            });
            expect(helperDateService.formatToIso).toHaveBeenCalledWith(
                invite.expiredAt
            );
        });
    });

    describe('buildOwnedUsers', () => {
        it('maps only personal-context inputs into owned users at the given slug attempt', () => {
            const result = util.buildOwnedUsers(
                [personalInput, inviteInput],
                1
            );

            expect(result).toEqual([
                {
                    userId: 'user-1',
                    workspaceId: 'workspace-1',
                    name: 'User One',
                    slug: 'slug-b',
                },
            ]);
        });
    });

    describe('countSlugAttempts', () => {
        it('returns the smallest candidate count across personal-context inputs', () => {
            const shorter: IUserCreateWithWorkspaceInput = {
                ...personalInput,
                workspaceContext: {
                    type: EnumUserSignUpWorkspaceContextType.personal,
                    workspaceId: 'workspace-3',
                    slugCandidates: ['slug-x'],
                    name: 'User Three',
                },
            };

            expect(util.countSlugAttempts([personalInput, shorter])).toBe(1);
        });

        it('returns a single attempt when no input carries slug candidates', () => {
            expect(util.countSlugAttempts([inviteInput])).toBe(1);
        });
    });
});
