import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
} from '@generated/prisma-client/client';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreateWithWorkspaceInput } from '@modules/user/interfaces/user.interface';
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
            workspaceMemberRoleId: 'role-workspace-member',
            projectId: null,
            projectMemberRoleId: null,
        },
        createdBy: 'user-2',
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [WorkspaceUtil],
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
