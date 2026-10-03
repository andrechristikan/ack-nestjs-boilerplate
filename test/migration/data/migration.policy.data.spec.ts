import { subject } from '@casl/ability';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    type Policy,
} from '@generated/prisma-client';
import { MigrationPolicyData } from '@migration/data/migration.policy.data';
import type { IMigrationPolicyData } from '@migration/interfaces/migration.interface';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';

describe('MigrationPolicyData seed invariants', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const seeded: IMigrationPolicyData[] =
        MigrationPolicyData[EnumAppEnvironment.test];
    const factory = new PolicyAbilityFactory();

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

    const abilityFor = (scope: EnumRoleScope, key: string): PolicyAbility => {
        const roleId = `${scope}:${key}`;
        const policies = seeded
            .filter(row => roleIdOf(row) === roleId)
            .flatMap(toPolicies);

        return factory.build(policies, {
            [EnumPolicyConditionPlaceholder.userId]: 'user-1',
            [EnumPolicyConditionPlaceholder.workspaceId]: 'workspace-1',
            [EnumPolicyConditionPlaceholder.projectId]: 'project-1',
        });
    };

    const member = (projectId: string) =>
        subject(EnumPolicySubject.ProjectMember, { projectId });

    it.each(seeded.map(data => [data.scope, data.key, data] as const))(
        'drops no rule of %s role %s under its richest context',
        (scope, key, data) => {
            const ability = abilityFor(scope, key);

            expect(ability.rules).toHaveLength(data.policies.length);
        }
    );

    it.each([EnumRoleWorkspaceKey.owner, EnumRoleWorkspaceKey.admin])(
        'lets workspace %s manage ProjectMember of the current project only',
        key => {
            const ability = abilityFor(EnumRoleScope.workspace, key);

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

    it('keeps workspace member away from ProjectMember', () => {
        const ability = abilityFor(
            EnumRoleScope.workspace,
            EnumRoleWorkspaceKey.member
        );

        expect(ability.can(EnumPolicyAction.read, member('project-1'))).toBe(
            false
        );
    });

    it('lets project admin manage ProjectMember of its project only', () => {
        const ability = abilityFor(
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
        key => {
            const ability = abilityFor(EnumRoleScope.project, key);

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

    it('gives platform admin no ProjectMember access', () => {
        const ability = abilityFor(
            EnumRoleScope.platform,
            EnumRolePlatformKey.admin
        );

        for (const action of Object.values(EnumPolicyAction)) {
            expect(ability.can(action, member('project-1'))).toBe(false);
        }
    });
});
