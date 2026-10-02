import { subject } from '@casl/ability';
import { mock } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    type Policy,
} from '@generated/prisma-client';
import { MigrationPolicyData } from '@migration/data/migration.policy.data';
import type { IMigrationPolicyData } from '@migration/interfaces/migration.interface';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';

describe('MigrationPolicyData seed invariants', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const seeded: IMigrationPolicyData[] =
        MigrationPolicyData[EnumAppEnvironment.test];
    const policyRepository = mock<PolicyRepository>();
    const domain = new PolicyAbilityDomain(
        policyRepository,
        new PolicyAbilityFactory(),
        mock<RequestStoreService>()
    );

    const roleIdOf = (data: IMigrationPolicyData): string =>
        `${data.scope}:${data.key}`;

    const toPolicies = (data: IMigrationPolicyData): Policy[] =>
        data.policies.map((rule, index) => ({
            id: `${roleIdOf(data)}:${index}`,
            roleId: roleIdOf(data),
            subject: rule.subject,
            action: rule.action,
            conditions: rule.conditions,
            inverted: rule.inverted,
            reason: rule.reason,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        }));

    const abilityFor = (
        scope: EnumRoleScope,
        key: string
    ): Promise<PolicyAbility> => {
        const roleId = `${scope}:${key}`;
        const empty = 'empty-role';

        return domain.buildAbility({
            user: {
                id: 'user-1',
                roleId: scope === EnumRoleScope.platform ? roleId : empty,
            },
            workspace: {
                id: 'workspace-1',
                memberRoleId:
                    scope === EnumRoleScope.workspace ? roleId : empty,
            },
            project: {
                id: 'project-1',
                memberRoleId: scope === EnumRoleScope.project ? roleId : null,
            },
        });
    };

    const member = (projectId: string) =>
        subject(EnumPolicySubject.ProjectMember, { projectId });

    beforeEach(() => {
        policyRepository.findManyByRoleId.mockImplementation(async roleId => {
            const data = seeded.find(row => roleIdOf(row) === roleId);

            return data ? toPolicies(data) : [];
        });
    });

    it.each(seeded.map(data => [data.scope, data.key, data] as const))(
        'drops no rule of %s role %s under its richest context',
        async (scope, key, data) => {
            const ability = await abilityFor(scope, key);

            expect(ability.rules).toHaveLength(data.policies.length);
        }
    );

    it.each([EnumRoleWorkspaceKey.owner, EnumRoleWorkspaceKey.admin])(
        'lets workspace %s manage ProjectMember of the current project only',
        async key => {
            const ability = await abilityFor(EnumRoleScope.workspace, key);

            for (const action of [
                EnumPolicyAction.create,
                EnumPolicyAction.read,
                EnumPolicyAction.update,
                EnumPolicyAction.delete,
            ]) {
                expect(ability.can(action, member('project-1'))).toBe(true);
                expect(ability.can(action, member('project-2'))).toBe(false);
            }
        }
    );

    it('keeps workspace member away from ProjectMember', async () => {
        const ability = await abilityFor(
            EnumRoleScope.workspace,
            EnumRoleWorkspaceKey.member
        );

        expect(ability.can(EnumPolicyAction.read, member('project-1'))).toBe(
            false
        );
    });

    it('lets project admin manage ProjectMember of its project only', async () => {
        const ability = await abilityFor(
            EnumRoleScope.project,
            EnumRoleProjectKey.admin
        );

        expect(ability.can(EnumPolicyAction.create, member('project-1'))).toBe(
            true
        );
        expect(ability.can(EnumPolicyAction.delete, member('project-1'))).toBe(
            true
        );
        expect(ability.can(EnumPolicyAction.read, member('project-2'))).toBe(
            false
        );
    });

    it.each([EnumRoleProjectKey.member, EnumRoleProjectKey.viewer])(
        'limits project %s to reading ProjectMember of its project',
        async key => {
            const ability = await abilityFor(EnumRoleScope.project, key);

            expect(
                ability.can(EnumPolicyAction.read, member('project-1'))
            ).toBe(true);
            expect(
                ability.can(EnumPolicyAction.create, member('project-1'))
            ).toBe(false);
            expect(
                ability.can(EnumPolicyAction.update, member('project-1'))
            ).toBe(false);
            expect(
                ability.can(EnumPolicyAction.delete, member('project-1'))
            ).toBe(false);
            expect(
                ability.can(EnumPolicyAction.read, member('project-2'))
            ).toBe(false);
        }
    );

    it('gives platform admin no ProjectMember access', async () => {
        const ability = await abilityFor(
            EnumRoleScope.platform,
            EnumRolePlatformKey.admin
        );

        for (const action of Object.values(EnumPolicyAction)) {
            expect(ability.can(action, member('project-1'))).toBe(false);
        }
    });
});
