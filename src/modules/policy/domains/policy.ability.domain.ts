import { Injectable } from '@nestjs/common';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type {
    IPolicyAbilityBuildInput,
    IPolicyAbilityPlatformInput,
    IPolicyAbilityProjectInput,
    IPolicyAbilityWorkspaceInput,
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

    /** Resolves the user's platform role rules; `userId` is the only placeholder on this layer. */
    private async resolvePlatformRules({
        user,
    }: IPolicyAbilityPlatformInput): Promise<PolicyAbilityRule[]> {
        return this.resolveRoleRules(user.roleId, {
            [EnumPolicyConditionPlaceholder.userId]: user.id,
        });
    }

    /** Resolves the acting workspace member's role rules; `workspaceId` is the only placeholder on this layer. */
    private async resolveWorkspaceRules({
        workspace,
    }: IPolicyAbilityWorkspaceInput): Promise<PolicyAbilityRule[]> {
        return this.resolveRoleRules(workspace.memberRoleId, {
            [EnumPolicyConditionPlaceholder.workspaceId]: workspace.id,
        });
    }

    /** Resolves the acting project member's role rules, none when no project member row exists; `projectId` is the only placeholder on this layer. */
    private async resolveProjectRules({
        project,
    }: IPolicyAbilityProjectInput): Promise<PolicyAbilityRule[]> {
        if (project.memberRoleId === null) {
            return [];
        }

        return this.resolveRoleRules(project.memberRoleId, {
            [EnumPolicyConditionPlaceholder.projectId]: project.id,
        });
    }

    /**
     * Builds the ability of exactly one layer from that layer's own input: the user's platform
     * role for `platform`; the acting workspace member's role for `workspace`; the acting project
     * member's role for `project`, empty when no project member row exists. A layer never carries
     * another layer's rules; the chain is composed at check time by
     * `PolicyDomain.requireComposedAbility`.
     */
    async buildAbility(
        input: IPolicyAbilityBuildInput
    ): Promise<PolicyAbility> {
        let rules: PolicyAbilityRule[];
        switch (input.scope) {
            case EnumPolicyAbilityScope.platform:
                rules = await this.resolvePlatformRules(input);
                break;
            case EnumPolicyAbilityScope.workspace:
                rules = await this.resolveWorkspaceRules(input);
                break;
            case EnumPolicyAbilityScope.project:
                rules = await this.resolveProjectRules(input);
                break;
        }

        return this.policyAbilityFactory.build(rules);
    }
}
