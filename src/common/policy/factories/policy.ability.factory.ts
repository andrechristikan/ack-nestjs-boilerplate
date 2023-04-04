import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { ENUM_POLICY_ACTION } from 'src/common/policy/constants/policy.enum.constant';
import {
    IPolicyAbility,
    IPolicyRule,
    IPolicyRuleAbility,
    PolicyHandler,
} from 'src/common/policy/interfaces/policy.interface';
import { ENUM_ROLE_TYPE } from 'src/common/role/constants/role.enum.constant';
import { RoleDoc } from 'src/common/role/repository/entities/role.entity';

@Injectable()
export class PolicyAbilityFactory {
    defineAbilityFromRole({ type, permissions }: RoleDoc) {
        const { can, build } = new AbilityBuilder<IPolicyAbility>(
            createMongoAbility
        );

        if (type === ENUM_ROLE_TYPE.SUPER_ADMIN) {
            can(ENUM_POLICY_ACTION.MANAGE, 'all');
        }

        for (const permission of permissions) {
            const abilities = this.mappingAbility(permission);

            for (const ability of abilities) {
                can(ability.action, ability.subject);
            }
        }

        return build();
    }

    mappingRules(rules: IPolicyRule[]): PolicyHandler[] {
        return rules
            .map(({ subject, action }) => {
                return action
                    .map(
                        (val) => (ability: IPolicyAbility) =>
                            ability.can(val, subject)
                    )
                    .flat(1);
            })
            .flat(1);
    }

    mappingAbility({ subject, action }: IPolicyRule): IPolicyRuleAbility[] {
        return action
            .map((val) => ({
                action: val,
                subject,
            }))
            .flat(1);
    }
}
