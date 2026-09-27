import { createPrismaAbility } from '@casl/prisma';
import type { EnumPolicyAction } from '@generated/prisma-client/client';
import type {
    IPolicyAbility,
    IPolicyAbilityRule,
    IPolicyAbilitySubject,
} from '@modules/policy/interfaces/policy.interface';
import { Injectable } from '@nestjs/common';

/** Builds the typed Prisma CASL ability from ordered policy rules. */
@Injectable()
export class PolicyAbilityFactory {
    /** Later rules take precedence over earlier ones, and an inverted rule becomes a `cannot` carrying its reason. */
    build(rules: IPolicyAbilityRule[]): IPolicyAbility {
        const rawRules = rules.map(rule => ({
            action: rule.action,
            subject: rule.subject,
            conditions: rule.conditions ?? undefined,
            inverted: rule.inverted,
            reason: rule.reason ?? undefined,
        }));

        return createPrismaAbility<[EnumPolicyAction, IPolicyAbilitySubject]>(
            rawRules
        );
    }
}
