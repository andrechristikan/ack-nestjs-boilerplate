import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
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
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateWithWorkspaceInput } from '@modules/user/interfaces/user.interface';
import type { IWorkspaceInviteInviter } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceUtil', () => {
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    const configValues: Record<string, unknown> = {
        'home.url': 'https://app.example.com',
        'workspace.slugRegex': /^[a-z0-9-]+$/,
        'workspace.slugPrefix': 'ws-',
        'workspace.slugMaxLength': 12,
        'workspace.slugMaxAttempts': 3,
        'workspace.invite.expiredInDays': 7,
        'workspace.invite.tokenLength': 40,
        'workspace.invite.referencePrefix': 'WIN',
        'workspace.invite.referenceRandomLength': 6,
        'workspace.invite.linkPattern':
            '{homeUrl}/workspace/invites?inviteToken={token}',
        'workspace.invite.signUpLinkPattern': '{homeUrl}/sign-up/{token}',
        'workspace.joinRequest.reviewLinkPattern':
            '{homeUrl}/workspace/join-requests/{joinRequestId}',
    };

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
    };

    const member: WorkspaceMember = {
        id: 'member-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-1',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
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
        configGet.mockImplementation((key: string) => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceUtil,
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        util = module.get(WorkspaceUtil);
    });

    describe('mapInvitePreview', () => {
        it('uses the inviter name when present', () => {
            const inviter: IWorkspaceInviteInviter = {
                name: 'Jane Doe',
                username: 'jane',
            };

            const result = util.mapInvitePreview(workspace, invite, inviter);

            expect(result).toEqual({
                workspaceName: 'Acme',
                inviterName: 'Jane Doe',
                workspaceRole: EnumWorkspaceMemberRole.member,
                expiredAt: invite.expiredAt,
            });
        });

        it('falls back to the inviter username when the name is null', () => {
            const inviter: IWorkspaceInviteInviter = {
                name: null,
                username: 'jane',
            };

            const result = util.mapInvitePreview(workspace, invite, inviter);

            expect(result.inviterName).toBe('jane');
        });

        it('falls back to the workspace name when the inviter is null', () => {
            const result = util.mapInvitePreview(workspace, invite, null);

            expect(result.inviterName).toBe('Acme');
        });
    });

    describe('resolveInviterName', () => {
        it('returns the inviter name', () => {
            expect(
                util.resolveInviterName(
                    { name: 'Jane Doe', username: 'jane' },
                    workspace
                )
            ).toBe('Jane Doe');
        });

        it('falls back to the inviter username when the name is null', () => {
            expect(
                util.resolveInviterName(
                    { name: null, username: 'jane' },
                    workspace
                )
            ).toBe('jane');
        });

        it('falls back to the workspace name when the inviter is missing', () => {
            expect(util.resolveInviterName(null, workspace)).toBe('Acme');
        });
    });

    describe('resolveRequesterName', () => {
        it('returns the requester name', () => {
            expect(
                util.resolveRequesterName({
                    name: 'Jane Doe',
                    username: 'jane',
                })
            ).toBe('Jane Doe');
        });

        it('falls back to the requester username when the name is null', () => {
            expect(
                util.resolveRequesterName({ name: null, username: 'jane' })
            ).toBe('jane');
        });

        it('falls back to a generic label when the requester is missing', () => {
            expect(util.resolveRequesterName(null)).toBe('A user');
        });
    });

    describe('createInviteTokenData', () => {
        beforeEach(() => {
            helperStringService.random
                .mockReturnValueOnce('token-value')
                .mockReturnValueOnce('reference-suffix');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.forward.mockReturnValue(
                new Date('2026-01-08T00:00:00.000Z')
            );
            helperStringService.fillPattern
                .mockReturnValueOnce(
                    'https://app.example.com/workspace/invites?inviteToken=token-value'
                )
                .mockReturnValueOnce(
                    'https://app.example.com/sign-up/token-value'
                );
        });

        it('builds token data with the default expiry when none is given', () => {
            const result = util.createInviteTokenData(null);

            expect(result).toEqual({
                token: 'token-value',
                hashedToken: 'hashed-token',
                reference: 'WIN-reference-suffix',
                expiredAt: new Date('2026-01-08T00:00:00.000Z'),
                claimLink:
                    'https://app.example.com/workspace/invites?inviteToken=token-value',
                signUpLink: 'https://app.example.com/sign-up/token-value',
            });
            expect(helperStringService.random).toHaveBeenNthCalledWith(1, 40);
            expect(helperStringService.random).toHaveBeenNthCalledWith(2, 6);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'token-value'
            );
            expect(helperDateService.forward).toHaveBeenCalledWith(
                new Date('2026-01-01T00:00:00.000Z'),
                Duration.fromObject({ days: 7 })
            );
            expect(helperStringService.fillPattern).toHaveBeenNthCalledWith(
                1,
                '{homeUrl}/workspace/invites?inviteToken={token}',
                { homeUrl: 'https://app.example.com', token: 'token-value' }
            );
            expect(helperStringService.fillPattern).toHaveBeenNthCalledWith(
                2,
                '{homeUrl}/sign-up/{token}',
                { homeUrl: 'https://app.example.com', token: 'token-value' }
            );
        });

        it('builds token data with the given expiry duration', () => {
            util.createInviteTokenData(14);

            expect(helperDateService.forward).toHaveBeenCalledWith(
                new Date('2026-01-01T00:00:00.000Z'),
                Duration.fromObject({ days: 14 })
            );
        });
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

    describe('buildJoinRequestReviewLink', () => {
        it('fills the review link pattern with the home url and join request id', () => {
            helperStringService.fillPattern.mockReturnValue(
                'https://app.example.com/workspace/join-requests/join-1'
            );

            const result = util.buildJoinRequestReviewLink('join-1');

            expect(result).toBe(
                'https://app.example.com/workspace/join-requests/join-1'
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                '{homeUrl}/workspace/join-requests/{joinRequestId}',
                { homeUrl: 'https://app.example.com', joinRequestId: 'join-1' }
            );
        });
    });

    describe('isInviteEmailMatch', () => {
        it('returns true for the same email in a different case', () => {
            expect(
                util.isInviteEmailMatch(
                    'Invitee@Example.com',
                    'invitee@example.com'
                )
            ).toBe(true);
        });

        it('returns false for a different email', () => {
            expect(
                util.isInviteEmailMatch(
                    'invitee@example.com',
                    'other@example.com'
                )
            ).toBe(false);
        });
    });

    describe('isPeerActionAllowed', () => {
        it('returns false when the target is an owner', () => {
            expect(
                util.isPeerActionAllowed(
                    EnumWorkspaceMemberRole.owner,
                    EnumWorkspaceMemberRole.owner
                )
            ).toBe(false);
        });

        it('returns false when an admin acts on an admin', () => {
            expect(
                util.isPeerActionAllowed(
                    EnumWorkspaceMemberRole.admin,
                    EnumWorkspaceMemberRole.admin
                )
            ).toBe(false);
        });

        it('returns true when an admin acts on a member', () => {
            expect(
                util.isPeerActionAllowed(
                    EnumWorkspaceMemberRole.admin,
                    EnumWorkspaceMemberRole.member
                )
            ).toBe(true);
        });

        it('returns true when an owner acts on an admin', () => {
            expect(
                util.isPeerActionAllowed(
                    EnumWorkspaceMemberRole.owner,
                    EnumWorkspaceMemberRole.admin
                )
            ).toBe(true);
        });
    });

    describe('hasRole', () => {
        it('returns true for an owner whatever the allowed roles', () => {
            expect(
                util.hasRole(
                    { ...member, role: EnumWorkspaceMemberRole.owner },
                    []
                )
            ).toBe(true);
        });

        it('returns true when the member role is allowed', () => {
            expect(
                util.hasRole(
                    { ...member, role: EnumWorkspaceMemberRole.admin },
                    [EnumWorkspaceMemberRole.admin]
                )
            ).toBe(true);
        });

        it('returns false when the member role is not allowed', () => {
            expect(util.hasRole(member, [EnumWorkspaceMemberRole.admin])).toBe(
                false
            );
        });
    });

    describe('drawSlugCandidates', () => {
        it('draws one slug candidate per configured attempt', () => {
            helperStringService.generateSlugCandidates.mockReturnValue([
                'ws-aaa',
                'ws-bbb',
                'ws-ccc',
            ]);

            const result = util.drawSlugCandidates();

            expect(result).toEqual(['ws-aaa', 'ws-bbb', 'ws-ccc']);
            expect(
                helperStringService.generateSlugCandidates
            ).toHaveBeenCalledWith('ws-', 12, 3);
        });
    });

    describe('isSlugAllowed', () => {
        it('returns true for a slug matching the pattern and length', () => {
            expect(util.isSlugAllowed('acme-team')).toBe(true);
        });

        it('returns false for a slug breaking the pattern', () => {
            expect(util.isSlugAllowed('Not Allowed!')).toBe(false);
        });

        it('returns false for a slug exceeding the max length', () => {
            expect(util.isSlugAllowed('a'.repeat(13))).toBe(false);
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
