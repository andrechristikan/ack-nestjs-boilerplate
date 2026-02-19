import {
    AbilityBuilder,
    subject as caslSubject,
} from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import {
    EnumPolicyAction,
    EnumPolicyEffect,
} from '@modules/policy/enums/policy.enum';
import {
    IPolicyAbilityInput,
    IPolicyAbilityRule,
    IPolicyAbilitySubject,
    IPolicyRule,
    PolicyConditionContext,
} from '@modules/policy/interfaces/policy.interface';

type AbilityApplyFn = (
    action: EnumPolicyAction[],
    subject: IPolicyAbilitySubject,
    fieldsOrConditions?: string[] | Record<string, unknown>,
    conditions?: Record<string, unknown>
) => { because: (reason: string) => void } | void;

/**
 * Factory class for creating and handling policy abilities using CASL library
 */
@Injectable()
export class PolicyAbilityFactory {
    private normalizePriority(ability: IPolicyAbilityInput): number {
        return typeof ability.priority === 'number' ? ability.priority : 0;
    }

    private sortRules(
        abilities: IPolicyAbilityInput[]
    ): IPolicyAbilityInput[] {
        return [...abilities].sort((left, right) => {
            const byPriority =
                this.normalizePriority(left) - this.normalizePriority(right);
            if (byPriority !== 0) {
                return byPriority;
            }

            const leftEffect = left.effect ?? EnumPolicyEffect.can;
            const rightEffect = right.effect ?? EnumPolicyEffect.can;
            if (leftEffect === rightEffect) {
                return 0;
            }

            // Apply allow rules first and deny rules last at the same priority.
            return leftEffect === EnumPolicyEffect.can ? -1 : 1;
        });
    }

    private buildRule(applyFn: AbilityApplyFn, ability: IPolicyAbilityInput): void {
        const fields = ability.fields?.filter(Boolean);
        const hasFields = !!fields && fields.length > 0;

        let rule: ReturnType<AbilityApplyFn>;

        if (hasFields) {
            // Field-level restriction with optional conditions
            rule = applyFn(ability.action, ability.subject, fields, ability.conditions);
        } else if (ability.conditions) {
            // Condition-only rule (e.g. { userId: '…' })
            rule = applyFn(ability.action, ability.subject, ability.conditions);
        } else {
            // Unrestricted subject-level rule
            rule = applyFn(ability.action, ability.subject);
        }

        if (rule && ability.reason) {
            rule.because(ability.reason);
        }
    }

    private resolveConditions(
        conditions: Record<string, unknown> | undefined,
        context: PolicyConditionContext
    ): Record<string, unknown> | undefined {
        if (!conditions) {
            return undefined;
        }

        const resolved: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(conditions)) {
            if (typeof value === 'string' && value.startsWith('$')) {
                const token = value.slice(1) as keyof PolicyConditionContext;
                resolved[key] = context[token] ?? value;
            } else {
                resolved[key] = value;
            }
        }

        return resolved;
    }

    /**
     * Creates policy ability rules for a specific user based on their permissions
     * @param {IPolicyAbilityInput[]} abilities - Array of policy abilities assigned to the user
     * @param {PolicyConditionContext} context - Context for resolving dynamic condition placeholders
     * @returns {IPolicyAbilityRule} CASL ability rule object for the user
     */
    createForUser(
        abilities: IPolicyAbilityInput[],
        context: PolicyConditionContext
    ): IPolicyAbilityRule {
        const builder = new AbilityBuilder<IPolicyAbilityRule>(
            createPrismaAbility
        );
        const defineCan = builder.can.bind(builder);
        const defineCannot = builder.cannot.bind(builder);

        for (const ability of this.sortRules(abilities)) {
            const withContext: IPolicyAbilityInput = {
                ...ability,
                conditions: this.resolveConditions(ability.conditions, context),
            };

            const isDeny = (withContext.effect ?? EnumPolicyEffect.can) === EnumPolicyEffect.cannot;
            this.buildRule(isDeny ? defineCannot : defineCan, withContext);
        }

        return builder.build({
            detectSubjectType: (item: {
                __caslSubjectType__?: IPolicyAbilitySubject;
            }) => {
                if (item.__caslSubjectType__) {
                    return item.__caslSubjectType__;
                }

                throw new Error(
                    'Cannot detect CASL subject type: missing __caslSubjectType__ on plain object. Use caslSubject() to tag resources.'
                );
            },
        });
    }

    /**
     * Evaluates a single rule against user abilities.
     * Always checks with `can()` - routes only declare what capability is required.
     */
    evaluateRule(userAbilities: IPolicyAbilityRule, rule: IPolicyRule): boolean {
        const fields = rule.fields?.filter(Boolean);
        const subject = rule.conditions
            ? caslSubject(rule.subject, rule.conditions)
            : rule.subject;

        const canForAction = (action: EnumPolicyAction): boolean => {
            if (!fields || fields.length === 0) {
                return userAbilities.can(
                    action,
                    subject as IPolicyAbilitySubject
                );
            }

            return fields.every((field: string) =>
                userAbilities.can(
                    action,
                    subject as IPolicyAbilitySubject,
                    field
                )
            );
        };

        return rule.action.every(canForAction);
    }

    /**
     * Validates if user abilities match all required rules for access control
     * @param {IPolicyAbilityRule} userAbilities - User's current ability rules
     * @param {IPolicyRule[]} rules - Required rules to check against
     * @returns {boolean} True if user has all required abilities, false otherwise
     */
    checkAllRules(userAbilities: IPolicyAbilityRule, rules: IPolicyRule[]): boolean {
        return rules.every((rule: IPolicyRule) =>
            this.evaluateRule(userAbilities, rule)
        );
    }
}
