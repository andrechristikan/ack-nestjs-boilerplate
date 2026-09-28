import { createPrismaAbility } from '@casl/prisma';
import { abilitySubjectOf } from '@modules/policy/constants/policy.constant';
import type { EnumPolicyAction } from '@generated/prisma-client/client';
import type {
    IPolicyAbility,
    IPolicyAbilityRule,
    IPolicyAbilitySubject,
} from '@modules/policy/interfaces/policy.interface';
import { Injectable } from '@nestjs/common';

/** Builds the typed Prisma CASL ability from policy rules. */
@Injectable()
export class PolicyAbilityFactory {
    /** Inverted rules are added after allows so a matching deny is authoritative. */
    build(rules: IPolicyAbilityRule[]): IPolicyAbility {
        const rawRules = [
            ...rules.filter(rule => !rule.inverted),
            ...rules.filter(rule => rule.inverted),
        ].map(rule => ({
            action: rule.action,
            subject: abilitySubjectOf(rule.subject),
            conditions: rule.conditions ?? undefined,
            inverted: rule.inverted,
            reason: rule.reason ?? undefined,
        }));

        return createPrismaAbility<[EnumPolicyAction, IPolicyAbilitySubject]>(
            rawRules
        );
    }
}
