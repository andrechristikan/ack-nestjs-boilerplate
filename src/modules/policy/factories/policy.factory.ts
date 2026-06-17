import {
    AbilityBuilder,
    ExtractSubjectType,
    createMongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { EnumPolicyAction } from '@modules/policy/enums/policy.enum';
import {
    IPolicyAbilityRule,
    IPolicyAbilitySubject,
} from '@modules/policy/interfaces/policy.interface';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

/**
 * Builds and evaluates CASL ability rules for policy checks.
 */
@Injectable()
export class PolicyAbilityFactory {
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
     * Returns true only when the user holds every required action on each subject.
     */
    handlerAbilities(
        userAbilities: IPolicyAbilityRule,
        abilities: RoleAbilityRequestDto[]
    ): boolean {
        return abilities.every((ability: RoleAbilityRequestDto) =>
            ability.action.every((action: EnumPolicyAction) =>
                userAbilities.can(action, ability.subject)
            )
        );
    }
}
