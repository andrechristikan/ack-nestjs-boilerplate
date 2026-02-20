import {
    AbilityBuilder,
    subject as caslSubject,
} from '@casl/ability';
import { PrismaQuery, createPrismaAbility } from '@casl/prisma';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import {
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
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

/**
 * Typed adapter for CASL's `AbilityBuilder.can` / `cannot` methods.
 *
 * CASL's TypeScript typings mark the `conditions` parameter as `never` when the
 * ability subject type is composed of string literals (as opposed to classes with
 * `__caslSubjectType__`).  This local type broadens the accepted signature to
 * `PrismaQuery` so the factory can pass resolved Prisma query conditions without
 * losing the real return type (`RuleBuilder<IPolicyAbilityRule>`).
 */
type AbilityApplyFn = (
    action: EnumPolicyAction | EnumPolicyAction[],
    subject: IPolicyAbilitySubject,
    fieldsOrConditions?: string | string[] | PrismaQuery,
    conditions?: PrismaQuery
) => { because(reason: string): unknown };

/**
 * Builds and evaluates CASL `PrismaAbility` instances.
 *
 * Centralises rule sorting, condition placeholder resolution, and rule
 * registration so the rest of the policy system works with a single compiled
 * ability object per request.
 */
@Injectable()
export class PolicyAbilityFactory {
    /**
     * Sorts abilities so that lower-priority rules come first and, within the same
     * priority level, `can` (allow) rules precede `cannot` (deny) rules.
     *
     * CASL evaluates rules in order and the last matching rule wins, so placing deny
     * rules after allow rules at the same priority gives denies precedence.
     */
    private sortRules(
        abilities: IPolicyAbilityInput[]
    ): IPolicyAbilityInput[] {
        const priority = (a: IPolicyAbilityInput): number => a.priority ?? 0;

        return [...abilities].sort((left, right) => {
            const byPriority = priority(left) - priority(right);
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

    /**
     * Registers a single ability definition with the CASL builder.
     *
     * Selects `builder.can` or `builder.cannot` based on `ability.effect`, then
     * applies field-level restrictions when `ability.fields` is non-empty, or
     * condition-only restrictions when `ability.conditions` is set, or a plain
     * subject-level rule otherwise.  If `ability.reason` is provided it is
     * attached to the rule via `RuleBuilder.because()`.
     *
     * The cast to `AbilityApplyFn` is intentional: CASL's own typings mark the
     * `conditions` parameter as `never` for string-literal subjects, but the
     * runtime correctly supports Prisma query conditions.  The cast is isolated
     * here so {@link createForUser} remains free of type assertions.
     *
     * @param builder - The `AbilityBuilder` instance for the current user.
     * @param ability - The resolved ability definition to register.
     */
    private buildRule(
        builder: AbilityBuilder<IPolicyAbilityRule>,
        ability: IPolicyAbilityInput
    ): void {
        const isDeny = (ability.effect ?? EnumPolicyEffect.can) === EnumPolicyEffect.cannot;
        const applyFn = (isDeny ? builder.cannot : builder.can) as unknown as AbilityApplyFn;

        const fields = ability.fields?.filter(Boolean);
        const hasFields = fields != null && fields.length > 0;

        let rule;
        if (hasFields) {
            rule = applyFn(ability.action, ability.subject, fields, ability.conditions);
        } else if (ability.conditions) {
            rule = applyFn(ability.action, ability.subject, ability.conditions);
        } else {
            rule = applyFn(ability.action, ability.subject);
        }

        if (ability.reason) {
            rule.because(ability.reason);
        }
    }

    /**
     * Resolves dynamic placeholders in a condition map against the current request
     * context.
     *
     * String values that start with `$` are treated as context references.  For
     * example, `{ userId: '$userId' }` is expanded to `{ userId: context.userId }`.
     * Placeholder resolution is recursive for nested objects and arrays.
     * Unknown placeholders are treated as configuration errors.
     *
     * @param conditions - Raw condition map from the ability definition, or
     *   `undefined` when no conditions are set.
     * @param context - Request-scoped values available for interpolation.
     * @returns A new condition map with all placeholders resolved, or `undefined`
     *   when `conditions` is `undefined`.
     */
    private resolveConditions(
        conditions: PrismaQuery | undefined,
        context: PolicyConditionContext
    ): PrismaQuery | undefined {
        if (conditions == null) {
            return undefined;
        }

        const resolveValue = (value: unknown, path: string): unknown => {
            if (typeof value === 'string' && value.startsWith('$')) {
                const token = value.slice(1) as keyof PolicyConditionContext;
                if (token in context) {
                    return context[token];
                }

                throw new InternalServerErrorException({
                    statusCode:
                        EnumPolicyStatusCodeError.invalidConditionPlaceholder,
                    message: 'policy.error.invalidConditionPlaceholder',
                    errors: [{ path, placeholder: value }],
                });
            }

            if (Array.isArray(value)) {
                return value.map((item, index) =>
                    resolveValue(item, `${path}[${index}]`)
                );
            }

            if (value && typeof value === 'object') {
                return Object.fromEntries(
                    Object.entries(value as Record<string, unknown>).map(
                        ([key, nested]) => [
                            key,
                            resolveValue(nested, `${path}.${key}`),
                        ]
                    )
                );
            }

            return value;
        };

        const resolved = resolveValue(conditions, 'conditions');
        if (resolved == null || typeof resolved !== 'object' || Array.isArray(resolved)) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.invalidConfiguration,
                message: 'policy.error.invalidConfiguration',
            });
        }

        return resolved as PrismaQuery;
    }

    /**
     * Creates a CASL `PrismaAbility` instance for a specific user.
     *
     * Rules are sorted by priority (ascending) and effect (`can` before `cannot` at
     * the same priority) before being registered with the builder, so higher-priority
     * deny rules always override lower-priority allow rules.  Dynamic condition
     * placeholders are resolved against `context` before registration.
     *
     * @param abilities - All ability definitions assigned to the user (e.g. from their
     *   role).
     * @param context - Request-scoped values used to interpolate `$`-prefixed
     *   condition placeholders (e.g. `{ userId }` for ownership checks).
     * @returns A frozen `PrismaAbility` that can be queried with `ability.can()` or
     *   passed to `accessibleBy()`.
     */
    createForUser(
        abilities: IPolicyAbilityInput[],
        context: PolicyConditionContext
    ): IPolicyAbilityRule {
        const builder = new AbilityBuilder<IPolicyAbilityRule>(createPrismaAbility);

        for (const ability of this.sortRules(abilities)) {
            this.buildRule(builder, {
                ...ability,
                conditions: this.resolveConditions(ability.conditions, context),
            });
        }

        return builder.build();
    }

    /**
     * Evaluates a single policy rule against the user's compiled ability.
     *
     * When `rule.conditions` is set the subject object is tagged with
     * `__caslSubjectType__` via `caslSubject()` so that `PrismaAbility`'s default
     * subject-type detector can identify it without a custom override.
     *
     * @param userAbilities - The compiled `PrismaAbility` for the current user.
     * @param rule - The requirement rule declared on the route handler.
     * @returns `true` when the user's ability permits every action (and every field,
     *   if specified) described by the rule; `false` otherwise.
     */
    evaluateRule(userAbilities: IPolicyAbilityRule, rule: IPolicyRule): boolean {
        const fields = rule.fields?.filter(Boolean);
        const subject = rule.conditions
            ? caslSubject(rule.subject, rule.conditions)
            : rule.subject;

        const canForAction = (action: EnumPolicyAction): boolean => {
            if (fields == null || fields.length === 0) {
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
}
