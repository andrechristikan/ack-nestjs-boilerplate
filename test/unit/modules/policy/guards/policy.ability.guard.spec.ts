import {
    buildPolicyAbility,
    stubRequestStore,
} from '@test/unit/helpers/test.unit.policy.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyContextStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { ProjectContextStoreKey } from '@modules/project/constants/project.constant';
import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { WorkspaceContextStoreKey } from '@modules/workspace/constants/workspace.constant';

describe('PolicyAbilityGuard', () => {
    let guard: PolicyAbilityGuard;
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const builtAbility = buildPolicyAbility([]);
    const userContext = { user: { id: 'user-1' } } as IUserContext;
    const workspaceContext = {
        workspaceId: 'workspace-1',
        workspace: { id: 'workspace-1' },
        workspaceMember: { role: { id: 'role-workspace' } },
    };
    const projectContext = {
        project: { id: 'project-1' },
        projectMember: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.createAbility.mockResolvedValue(builtAbility);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyAbilityGuard,
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        guard = module.get(PolicyAbilityGuard);
    });

    it('returns true without creating anything when an ability is already stored', async () => {
        stubRequestStore(requestStoreService, {
            [PolicyContextStoreKey]: { ability: {} } as IPolicyContext,
        });

        const result = await guard.canActivate();

        expect(result).toBe(true);
        expect(policyAbilityService.createAbility).not.toHaveBeenCalled();
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });

    it('throws the user guard-missing exception when no user is stored', async () => {
        stubRequestStore(requestStoreService, {});

        await expect(guard.canActivate()).rejects.toThrow(
            UserGuardMissingException
        );
        expect(policyAbilityService.createAbility).not.toHaveBeenCalled();
    });

    it('passes null workspace and project contexts when the route has neither', async () => {
        stubRequestStore(requestStoreService, {
            [UserContextStoreKey]: userContext,
        });

        await guard.canActivate();

        expect(policyAbilityService.createAbility).toHaveBeenCalledWith(
            userContext,
            null,
            null
        );
    });

    it('passes the stored user, workspace, and project contexts to the service', async () => {
        stubRequestStore(requestStoreService, {
            [UserContextStoreKey]: userContext,
            [WorkspaceContextStoreKey]: workspaceContext,
            [ProjectContextStoreKey]: projectContext,
        });

        await guard.canActivate();

        expect(policyAbilityService.createAbility).toHaveBeenCalledWith(
            userContext,
            workspaceContext,
            projectContext
        );
    });

    it('passes a null workspace context when the stored workspace patch lacks the member', async () => {
        stubRequestStore(requestStoreService, {
            [UserContextStoreKey]: userContext,
            [WorkspaceContextStoreKey]: {
                workspaceId: 'workspace-1',
                workspace: { id: 'workspace-1' },
            },
        });

        await guard.canActivate();

        expect(policyAbilityService.createAbility).toHaveBeenCalledWith(
            userContext,
            null,
            null
        );
    });

    it('passes a null project context when the stored project patch lacks the project', async () => {
        stubRequestStore(requestStoreService, {
            [UserContextStoreKey]: userContext,
            [ProjectContextStoreKey]: { projectMember: null },
        });

        await guard.canActivate();

        expect(policyAbilityService.createAbility).toHaveBeenCalledWith(
            userContext,
            null,
            null
        );
    });

    it('stores the created ability in the policy context and returns true', async () => {
        stubRequestStore(requestStoreService, {
            [UserContextStoreKey]: userContext,
        });

        const result = await guard.canActivate();

        expect(result).toBe(true);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            PolicyContextStoreKey,
            { ability: builtAbility }
        );
    });
});
