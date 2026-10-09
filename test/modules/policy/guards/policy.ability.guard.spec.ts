import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type {
    IPolicyRule,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';

describe('PolicyAbilityGuard', () => {
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> = mock();
    const policyDomain: MockProxy<PolicyDomain> = mock();
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> = mock();
    const policies: IPolicyRule[] = [];
    const requestStoreService: MockProxy<RequestStoreService> = mock();
    const ability: MockProxy<PolicyAbility> = mock();
    const user = { id: 'user-id', roleId: 'user-role-id' };
    const workspace = { id: 'workspace-id' };
    const workspaceMember = { roleId: 'workspace-member-role-id' };
    const project = { id: 'project-id' };
    const projectMember = { roleId: 'project-member-role-id' };
    let guard: PolicyAbilityGuard;

    const stubStore = (store: Record<string, unknown>): void => {
        requestStoreService.get.mockImplementation(
            (key: string) => (store[key] ?? null) as never
        );
    };

    beforeEach(() => {
        vi.resetAllMocks();
        guard = new PolicyAbilityGuard(
            policyAbilityDomain,
            policyDomain,
            policyAbilityFactory,
            requestStoreService
        );
        policyAbilityDomain.requireStored.mockReturnValue(user);
        policyDomain.findManyByRoleIds.mockResolvedValue(policies);
        policyAbilityFactory.build.mockReturnValue(ability);
    });

    it('reuses an ability already stored on the request', async () => {
        stubStore({ [PolicyAbilityStoreKey]: ability });

        await expect(guard.canActivate()).resolves.toBe(true);
        expect(requestStoreService.get).toHaveBeenCalledWith(
            PolicyAbilityStoreKey
        );
        expect(policyAbilityDomain.requireStored).not.toHaveBeenCalled();
        expect(policyDomain.findManyByRoleIds).not.toHaveBeenCalled();
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it('propagates the error when no user is stored', async () => {
        stubStore({});
        const error = new Error('no user');
        policyAbilityDomain.requireStored.mockImplementation(() => {
            throw error;
        });

        await expect(guard.canActivate()).rejects.toBe(error);
        expect(policyAbilityDomain.requireStored).toHaveBeenCalledWith(
            UserStoreKey
        );
        expect(policyDomain.findManyByRoleIds).not.toHaveBeenCalled();
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it('loads user, workspace and project roles in order and builds with the placeholder map', async () => {
        stubStore({
            [WorkspaceStoreKey]: workspace,
            [WorkspaceMemberStoreKey]: workspaceMember,
            [ProjectStoreKey]: project,
            [ProjectMemberStoreKey]: projectMember,
        });

        await expect(guard.canActivate()).resolves.toBe(true);
        expect(policyDomain.findManyByRoleIds).toHaveBeenCalledWith(
            'user-role-id',
            'workspace-member-role-id',
            'project-member-role-id'
        );
        expect(policyAbilityFactory.build).toHaveBeenCalledWith(policies, {
            '${userId}': 'user-id',
            '${workspaceId}': 'workspace-id',
            '${projectId}': 'project-id',
        });
        expect(requestStoreService.set).toHaveBeenCalledExactlyOnceWith(
            PolicyAbilityStoreKey,
            ability
        );
    });

    it('loads only the user role and leaves scope placeholders undefined when no scope is stored', async () => {
        stubStore({});

        await guard.canActivate();

        expect(policyDomain.findManyByRoleIds).toHaveBeenCalledWith(
            'user-role-id'
        );
        expect(policyAbilityFactory.build).toHaveBeenCalledWith(policies, {
            '${userId}': 'user-id',
            '${workspaceId}': undefined,
            '${projectId}': undefined,
        });
    });

    it('skips a missing project member role but keeps the project placeholder', async () => {
        stubStore({
            [WorkspaceStoreKey]: workspace,
            [WorkspaceMemberStoreKey]: workspaceMember,
            [ProjectStoreKey]: project,
        });

        await guard.canActivate();

        expect(policyDomain.findManyByRoleIds).toHaveBeenCalledWith(
            'user-role-id',
            'workspace-member-role-id'
        );
        expect(policyAbilityFactory.build).toHaveBeenCalledWith(
            policies,
            expect.objectContaining({ '${projectId}': 'project-id' })
        );
    });

    it('propagates a policy load failure and stores nothing', async () => {
        stubStore({});
        const error = new Error('db down');
        policyDomain.findManyByRoleIds.mockRejectedValue(error);

        await expect(guard.canActivate()).rejects.toBe(error);
        expect(policyAbilityFactory.build).not.toHaveBeenCalled();
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
