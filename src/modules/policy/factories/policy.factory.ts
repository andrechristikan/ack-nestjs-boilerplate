import {
    AbilityBuilder,
    ExtractSubjectType,
    createMongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { EnumPolicyAction, Policy } from '@generated/prisma-client';
import {
    IPolicyAbilityRule,
    IPolicyAbilitySubject,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';

/**
 * Builds and evaluates CASL ability rules for policy checks.
 */
@Injectable()
export class PolicyAbilityFactory {
    createForUser(policies: Policy[]): IPolicyAbilityRule {
        const { can, build } = new AbilityBuilder<IPolicyAbilityRule>(
            createMongoAbility
        );

        for (const policy of policies) {
            can(policy.action, policy.subject);
        }

        return build({
            // Read https://casl.js.org/v6/en/guide/subject-type-detection#use-classes-as-subject-types for details
            detectSubjectType: (item: {
                constructor: ExtractSubjectType<IPolicyAbilitySubject>;
            }) => item.constructor,
        });
    }

    /**
     * Returns true only when the user holds every required action on each subject.
     */
    handlerPolicies(
        userPolicies: IPolicyAbilityRule,
        policies: PolicyRequestDto[]
    ): boolean {
        return policies.every((policy: PolicyRequestDto) =>
            policy.action.every((action: EnumPolicyAction) =>
                userPolicies.can(action, policy.subject)
            )
        );
    }
}
