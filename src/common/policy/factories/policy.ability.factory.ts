import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_TYPE } from 'src/common/auth/constants/auth.enum.constant';
import { ENUM_POLICY_ACTION } from 'src/common/policy/constants/policy.enum.constant';
import {
    IPolicyAbility,
    IPolicyRule,
    IPolicyRuleAbility,
    PolicyHandler,
} from 'src/common/policy/interfaces/policy.interface';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';

@Injectable()
export class PolicyAbilityFactory {
    defineAbilityForUser(user: IUserEntity) {
        const { can, build } = new AbilityBuilder<IPolicyAbility>(
            createMongoAbility
        );

        if (user.role.type === ENUM_AUTH_TYPE.SUPER_ADMIN) {
            can(ENUM_POLICY_ACTION.MANAGE, 'all');
        }

        // todo
        // mapping permission
        for (const permission of user.role.permissions) {
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
