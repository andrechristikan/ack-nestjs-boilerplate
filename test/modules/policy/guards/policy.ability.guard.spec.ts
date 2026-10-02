import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
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
            requestStoreService
        );
        policyAbilityDomain.requireStored.mockReturnValue(user);
        policyAbilityDomain.buildAbility.mockResolvedValue(ability);
    });

    it('reuses an ability already stored on the request', async () => {
        stubStore({ [PolicyAbilityStoreKey]: ability });

        await expect(guard.canActivate()).resolves.toBe(true);
        expect(requestStoreService.get).toHaveBeenCalledWith(
            PolicyAbilityStoreKey
        );
        expect(policyAbilityDomain.requireStored).not.toHaveBeenCalled();
        expect(policyAbilityDomain.buildAbility).not.toHaveBeenCalled();
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
        expect(policyAbilityDomain.buildAbility).not.toHaveBeenCalled();
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it('builds a user-only ability when no workspace or project is stored', async () => {
        stubStore({});

        await expect(guard.canActivate()).resolves.toBe(true);
        expect(policyAbilityDomain.requireStored).toHaveBeenCalledWith(
            UserStoreKey
        );
        expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
            user: { id: user.id, roleId: user.roleId },
        });
    });

    it('adds the workspace scope when workspace and member are stored', async () => {
        stubStore({
            [WorkspaceStoreKey]: workspace,
            [WorkspaceMemberStoreKey]: workspaceMember,
        });

        await guard.canActivate();

        expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
            user: { id: user.id, roleId: user.roleId },
            workspace: {
                id: workspace.id,
                memberRoleId: workspaceMember.roleId,
            },
        });
    });

    it.each([
        ['workspace without member', { [WorkspaceStoreKey]: workspace }],
        [
            'member without workspace',
            { [WorkspaceMemberStoreKey]: workspaceMember },
        ],
    ])('omits the workspace scope for %s', async (_, store) => {
        stubStore(store);

        await guard.canActivate();

        expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
            user: { id: user.id, roleId: user.roleId },
        });
    });

    it('adds the project scope with the member role when a project member is stored', async () => {
        stubStore({
            [ProjectStoreKey]: project,
            [ProjectMemberStoreKey]: projectMember,
        });

        await guard.canActivate();

        expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
            user: { id: user.id, roleId: user.roleId },
            project: { id: project.id, memberRoleId: projectMember.roleId },
        });
    });

    it('adds the project scope with a null member role when no project member is stored', async () => {
        stubStore({ [ProjectStoreKey]: project });

        await guard.canActivate();

        expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
            user: { id: user.id, roleId: user.roleId },
            project: { id: project.id, memberRoleId: null },
        });
    });

    it('stores the built ability on the request', async () => {
        stubStore({
            [WorkspaceStoreKey]: workspace,
            [WorkspaceMemberStoreKey]: workspaceMember,
            [ProjectStoreKey]: project,
            [ProjectMemberStoreKey]: projectMember,
        });

        await expect(guard.canActivate()).resolves.toBe(true);
        expect(policyAbilityDomain.buildAbility).toHaveBeenCalledWith({
            user: { id: user.id, roleId: user.roleId },
            workspace: {
                id: workspace.id,
                memberRoleId: workspaceMember.roleId,
            },
            project: { id: project.id, memberRoleId: projectMember.roleId },
        });
        expect(requestStoreService.set).toHaveBeenCalledTimes(1);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            PolicyAbilityStoreKey,
            ability
        );
    });
});
