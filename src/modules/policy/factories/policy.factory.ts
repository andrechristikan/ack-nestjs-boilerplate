import {
    AbilityBuilder,
    createMongoAbility,
    ExtractSubjectType,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    IPolicyAbility,
    IPolicyAbilityRule,
    IPolicyAbilitySubject,
} from 'src/modules/policy/interfaces/policy.interface';
import { RolePermissionEntity } from 'src/modules/role/repository/entities/role.permission.entity';

@Injectable()
export class PolicyAbilityFactory {
    createForUser(permissions: RolePermissionEntity[]): IPolicyAbilityRule {
        const { can, build } = new AbilityBuilder<IPolicyAbilityRule>(
            createMongoAbility
        );

        if (permissions.some(e => e.subject === ENUM_POLICY_SUBJECT.ALL)) {
            can(ENUM_POLICY_ACTION.MANAGE, 'all');
        } else {
            for (const permission of permissions) {
                can(permission.action, permission.subject);
            }
        }

        return build({
            // Read https://casl.js.org/v6/en/guide/subject-type-detection#use-classes-as-subject-types for details
            detectSubjectType: (item: any) =>
                item.constructor as ExtractSubjectType<IPolicyAbilitySubject>,
        });
    }

    handlerAbilities(
        userAbilities: IPolicyAbilityRule,
        abilities: IPolicyAbility[]
    ): boolean {
        return abilities.every((ability: IPolicyAbility) =>
            ability.action.every((action: ENUM_POLICY_ACTION) =>
                userAbilities.can(action, ability.subject)
            )
        );
    }
}
