import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';

describe('PolicyAbilityDomain', () => {
    const policyRepository: MockProxy<PolicyRepository> =
        mock<PolicyRepository>();
    const policyAbilityFactory: MockProxy<PolicyAbilityFactory> =
        mock<PolicyAbilityFactory>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    let domain: PolicyAbilityDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        Object.defineProperty(ability, 'rules', {
            value: [],
            configurable: true,
        });
        policyRepository.findManyByRoleId.mockResolvedValue([]);
        policyAbilityFactory.buildFromPolicies.mockReturnValue(ability);
        policyAbilityFactory.build.mockReturnValue(ability);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyAbilityDomain,
                { provide: PolicyRepository, useValue: policyRepository },
                {
                    provide: PolicyAbilityFactory,
                    useValue: policyAbilityFactory,
                },
            ],
        }).compile();
        domain = moduleRef.get(PolicyAbilityDomain);
    });

    it('loads the platform role and returns one ability', async () => {
        await expect(
            domain.buildAbility({
                user: { id: 'user-1', roleId: 'platform-role' },
            })
        ).resolves.toBe(ability);

        expect(policyRepository.findManyByRoleId).toHaveBeenCalledWith(
            'platform-role'
        );
        expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(1);
        expect(policyAbilityFactory.build).toHaveBeenCalledTimes(1);
    });

    it('adds workspace and project roles to the same ability', async () => {
        await domain.buildAbility({
            user: { id: 'user-1', roleId: 'platform-role' },
            workspace: { id: 'workspace-1', memberRoleId: 'workspace-role' },
            project: { id: 'project-1', memberRoleId: 'project-role' },
        });

        expect(policyRepository.findManyByRoleId).toHaveBeenNthCalledWith(
            1,
            'platform-role'
        );
        expect(policyRepository.findManyByRoleId).toHaveBeenNthCalledWith(
            2,
            'workspace-role'
        );
        expect(policyRepository.findManyByRoleId).toHaveBeenNthCalledWith(
            3,
            'project-role'
        );
        expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(3);
    });

    it('does not load a project role when project membership is absent', async () => {
        await domain.buildAbility({
            user: { id: 'user-1', roleId: 'platform-role' },
            project: { id: 'project-1', memberRoleId: null },
        });

        expect(policyRepository.findManyByRoleId).toHaveBeenCalledTimes(1);
    });
});
