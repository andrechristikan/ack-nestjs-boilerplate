import {
    AbilityBuilder,
    ExtractSubjectType,
    subject as caslSubject,
    createMongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import {
    EnumPolicyAction,
    EnumPolicyEffect,
} from '@modules/policy/enums/policy.enum';
import {
    IPolicyAbilityRule,
    IPolicyAbilitySubject,
} from '@modules/policy/interfaces/policy.interface';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

/**
 * Factory class for creating and handling policy abilities using CASL library
 */
@Injectable()
export class PolicyAbilityFactory {
    private normalizePriority(ability: RoleAbilityRequestDto): number {
        return typeof ability.priority === 'number' ? ability.priority : 0;
    }

    private sortRules(abilities: RoleAbilityRequestDto[]): RoleAbilityRequestDto[] {
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

    private buildRule(
        applyRule: (
            action: EnumPolicyAction[],
            subject: IPolicyAbilitySubject,
            fieldsOrConditions?: string[] | Record<string, unknown>,
            conditions?: Record<string, unknown>
        ) => { because: (reason: string) => void } | void,
        ability: RoleAbilityRequestDto
    ): void {
        const fields = ability.fields?.filter(Boolean);
        const hasFields = !!fields && fields.length > 0;
        const hasConditions = !!ability.conditions;

        const rule = hasFields
            ? applyRule(
                  ability.action,
                  ability.subject,
                  fields,
                  ability.conditions
              )
            : hasConditions
              ? applyRule(
                    ability.action,
                    ability.subject,
                    ability.conditions
                )
              : applyRule(ability.action, ability.subject);

        if (rule && ability.reason) {
            rule.because(ability.reason);
        }
    }

    /**
     * Creates policy ability rules for a specific user based on their permissions
     * @param {IPolicyAbility[]} abilities - Array of policy abilities assigned to the user
     * @returns {IPolicyAbilityRule} CASL ability rule object for the user
     */
    createForUser(abilities: RoleAbilityRequestDto[]): IPolicyAbilityRule {
        const builder = new AbilityBuilder<IPolicyAbilityRule>(createMongoAbility);
        const defineCan = builder.can.bind(builder);
        const defineCannot = builder.cannot.bind(builder);

        for (const ability of this.sortRules(abilities)) {
            if ((ability.effect ?? EnumPolicyEffect.can) === EnumPolicyEffect.cannot) {
                this.buildRule(defineCannot, ability);
                continue;
            }

            this.buildRule(defineCan, ability);
        }

        return builder.build({
            // Read https://casl.js.org/v6/en/guide/subject-type-detection#use-classes-as-subject-types for details
            detectSubjectType: (item: {
                __caslSubjectType__?: IPolicyAbilitySubject;
                constructor: ExtractSubjectType<IPolicyAbilitySubject>;
            }) => item.__caslSubjectType__ ?? item.constructor,
        });
    }

    private checkOneRule(
        userAbilities: IPolicyAbilityRule,
        rule: RoleAbilityRequestDto,
        resource?: Record<string, unknown>
    ): boolean {
        const effect = rule.effect ?? EnumPolicyEffect.can;
        const fields = rule.fields?.filter(Boolean);
        const subject: unknown = resource
            ? caslSubject(rule.subject, resource)
            : rule.subject;

        const canForAction = (action: EnumPolicyAction): boolean => {
            if (!fields || fields.length === 0) {
                return effect === EnumPolicyEffect.cannot
                    ? !userAbilities.can(action, subject as IPolicyAbilitySubject)
                    : userAbilities.can(action, subject as IPolicyAbilitySubject);
            }

            const fieldsAllowed = fields.every((field: string) =>
                effect === EnumPolicyEffect.cannot
                    ? !userAbilities.can(
                          action,
                          subject as IPolicyAbilitySubject,
                          field
                      )
                    : userAbilities.can(
                          action,
                          subject as IPolicyAbilitySubject,
                          field
                      )
            );
            return fieldsAllowed;
        };

        return rule.action.every(canForAction);
    }

    /**
     * Validates if user abilities match the required abilities for access control
     * @param {IPolicyAbilityRule} userAbilities - User's current ability rules
     * @param {RoleAbilityRequestDto[]} abilities - Required abilities to check against
     * @returns {boolean} True if user has all required abilities, false otherwise
     */
    handlerAbilities(
        userAbilities: IPolicyAbilityRule,
        abilities: RoleAbilityRequestDto[],
        resource?: Record<string, unknown>
    ): boolean {
        return abilities.every((ability: RoleAbilityRequestDto) =>
            this.checkOneRule(userAbilities, ability, resource)
        );
    }
}
