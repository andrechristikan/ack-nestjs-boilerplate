import { mock } from 'vitest-mock-extended';
import { DatabaseService } from '@common/database/services/database.service';
import { MigrationPolicyData } from '@migration/data/migration.policy.data';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { PolicyCache } from '@modules/policy/caches/policy.cache';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { RoleDomain } from '@modules/role/domains/role.domain';

describe('MigrationPolicyData against the policy rule validator', () => {
    const policyDomain = new PolicyDomain(
        mock<PolicyRepository>(),
        mock<PolicyCache>(),
        mock<RoleDomain>(),
        mock<DatabaseService>(),
        mock<ActivityLogDomain>()
    );

    const cases = Object.entries(MigrationPolicyData).flatMap(
        ([environment, roles]) =>
            roles.flatMap(role =>
                role.policies.map(policy => ({
                    label: `${environment} ${role.scope}/${role.key} ${policy.subject} [${policy.action.join(',')}]`,
                    scope: role.scope,
                    policy,
                }))
            )
    );

    it('has rules to check', () => {
        expect(cases.length).toBeGreaterThan(0);
    });

    it.each(cases)(
        'every MigrationPolicyData rule passes validateRule with its role scope: $label',
        ({ scope, policy }) => {
            expect(() =>
                policyDomain.validateRule(scope, policy)
            ).not.toThrow();
        }
    );
});
