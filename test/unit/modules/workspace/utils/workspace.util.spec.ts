import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
    EnumTermPolicyType,
    EnumWorkspaceInviteStatus,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateWithWorkspaceInput } from '@modules/user/interfaces/user.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceUtil', () => {
    let util: WorkspaceUtil;

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
            type: EnumUserCreateWorkspaceContextType.personal,
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
            type: EnumUserCreateWorkspaceContextType.invite,
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
        const module: TestingModule = await Test.createTestingModule({
            providers: [WorkspaceUtil, HelperStringService],
        }).compile();

        util = module.get(WorkspaceUtil);
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

    describe('toCensoredInvite', () => {
        it('censors the email and keeps every other field', () => {
            const invite = {
                id: 'invite-1',
                workspaceId: 'workspace-1',
                email: 'invitee.person@example.com',
                workspaceRole: EnumWorkspaceMemberRole.member,
                projectId: null,
                projectRole: null,
                reference: 'REF123',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                status: EnumWorkspaceInviteStatus.pending,
                invitedByUserId: 'user-1',
                acceptedAt: null,
                acceptedByUserId: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: 'user-1',
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };

            expect(util.toCensoredInvite(invite)).toEqual({
                ...invite,
                email: 'invi********on@e**********',
            });
        });
    });

    describe('countSlugAttempts', () => {
        it('returns the smallest candidate count across personal-context inputs', () => {
            const shorter: IUserCreateWithWorkspaceInput = {
                ...personalInput,
                workspaceContext: {
                    type: EnumUserCreateWorkspaceContextType.personal,
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
