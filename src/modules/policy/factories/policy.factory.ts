import {
    AbilityBuilder,
    ExtractSubjectType,
    createMongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { ENUM_POLICY_ACTION } from '@modules/policy/enums/policy.enum';
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
    /**
     * Creates policy ability rules for a specific user based on their permissions
     * @param {IPolicyAbility[]} abilities - Array of policy abilities assigned to the user
     * @returns {IPolicyAbilityRule} CASL ability rule object for the user
     */
    createForUser(abilities: RoleAbilityRequestDto[]): IPolicyAbilityRule {
        const { can, build } = new AbilityBuilder<IPolicyAbilityRule>(
            createMongoAbility
        );

        for (const ability of abilities) {
            can(ability.action, ability.subject);
        }

        return build({
            // Read https://casl.js.org/v6/en/guide/subject-type-detection#use-classes-as-subject-types for details
            detectSubjectType: (item: {
                constructor: ExtractSubjectType<IPolicyAbilitySubject>;
            }) => item.constructor,
        });
    }

    /**
     * Validates if user abilities match the required abilities for access control
     * @param {IPolicyAbilityRule} userAbilities - User's current ability rules
     * @param {RoleAbilityRequestDto[]} abilities - Required abilities to check against
     * @returns {boolean} True if user has all required abilities, false otherwise
     */
    handlerAbilities(
        userAbilities: IPolicyAbilityRule,
        abilities: RoleAbilityRequestDto[]
    ): boolean {
        return abilities.every((ability: RoleAbilityRequestDto) =>
            ability.action.every((action: ENUM_POLICY_ACTION) =>
                userAbilities.can(action, ability.subject)
            )
        );
    }
}
