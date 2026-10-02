import { Injectable } from '@nestjs/common';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type {
    IPolicyAbilityBuildInput,
    PolicyAbility,
    PolicyAbilityRule,
    PolicyPlaceholderValues,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';

/** Loads the role policies of one ability layer per call and builds that layer's ability from them. */
@Injectable()
export class PolicyAbilityDomain {
    constructor(
        private readonly policyRepository: PolicyRepository,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    /**
     * Loads the policies of one role and resolves their condition placeholders into the rules of a
     * single layer.
     */
    private async resolveRoleRules(
        roleId: string,
        placeholders: PolicyPlaceholderValues
    ): Promise<PolicyAbilityRule[]> {
        const policies = await this.policyRepository.findManyByRoleId(roleId);
        const ability = this.policyAbilityFactory.buildFromPolicies(
            policies,
            placeholders
        );

        return ability.rules;
    }

    /** Builds one ability from every role available in the request context. */
    async buildAbility(
        input: IPolicyAbilityBuildInput
    ): Promise<PolicyAbility> {
        const rules: PolicyAbilityRule[] = await this.resolveRoleRules(
            input.user.roleId,
            { [EnumPolicyConditionPlaceholder.userId]: input.user.id }
        );

        if (input.workspace !== undefined) {
            rules.push(
                ...(await this.resolveRoleRules(input.workspace.memberRoleId, {
                    [EnumPolicyConditionPlaceholder.workspaceId]:
                        input.workspace.id,
                }))
            );
        }

        if (
            input.project !== undefined &&
            input.project.memberRoleId !== null
        ) {
            rules.push(
                ...(await this.resolveRoleRules(input.project.memberRoleId, {
                    [EnumPolicyConditionPlaceholder.projectId]:
                        input.project.id,
                }))
            );
        }

        return this.policyAbilityFactory.build(rules);
    }
}
