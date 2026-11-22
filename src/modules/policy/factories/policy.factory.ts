import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { EnumPolicyAction } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import type { IPolicyAbilityRule } from '@modules/policy/interfaces/policy.interface';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';

@Injectable()
export class PolicyAbilityFactory {
    createByUser(policies: Policy[]): IPolicyAbilityRule {
        const { can, build } = new AbilityBuilder<IPolicyAbilityRule>(
            createMongoAbility
        );

        for (const policy of policies) {
            can(policy.action, policy.subject);
        }

        return build();
    }

    handlerPolicies(
        userPolicies: IPolicyAbilityRule,
        policies: PolicyRequestDto[]
    ): boolean {
        if (policies.length === 0) {
            return false;
        }

        return policies.every(
            (policy: PolicyRequestDto) =>
                policy.action.length > 0 &&
                policy.action.every((action: EnumPolicyAction) =>
                    userPolicies.can(action, policy.subject)
                )
        );
    }
}
