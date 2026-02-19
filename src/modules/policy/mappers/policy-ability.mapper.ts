import {
    EnumPolicyAction,
    EnumPolicyEffect,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { IPolicyAbilityInput } from '@modules/policy/interfaces/policy.interface';
import { RoleAbility } from '@prisma/client';

const validSubjects = new Set<string>(Object.values(EnumPolicySubject));
const validActions = new Set<string>(Object.values(EnumPolicyAction));
const validEffects = new Set<string>(Object.values(EnumPolicyEffect));

export function mapPrismaAbilityToPolicy(
    raw: RoleAbility
): IPolicyAbilityInput {
    if (!validSubjects.has(raw.subject)) {
        throw new Error(
            `Invalid policy subject: "${raw.subject}". Expected one of: ${[...validSubjects].join(', ')}`
        );
    }

    const actions = raw.action.filter((a: string) => {
        if (!validActions.has(a)) {
            throw new Error(
                `Invalid policy action: "${a}". Expected one of: ${[...validActions].join(', ')}`
            );
        }
        return true;
    }) as EnumPolicyAction[];

    if (raw.effect && !validEffects.has(raw.effect)) {
        throw new Error(
            `Invalid policy effect: "${raw.effect}". Expected one of: ${[...validEffects].join(', ')}`
        );
    }

    const result: IPolicyAbilityInput = {
        subject: raw.subject as EnumPolicySubject,
        action: actions,
    };

    if (raw.effect) {
        result.effect = raw.effect as EnumPolicyEffect;
    }

    if (raw.fields && Array.isArray(raw.fields)) {
        result.fields = raw.fields as string[];
    }

    if (
        raw.conditions &&
        typeof raw.conditions === 'object' &&
        !Array.isArray(raw.conditions)
    ) {
        result.conditions = raw.conditions as Record<string, unknown>;
    }

    if (raw.reason) {
        result.description = raw.reason;
    }

    if (typeof raw.priority === 'number') {
        result.priority = raw.priority;
    }

    return result;
}
