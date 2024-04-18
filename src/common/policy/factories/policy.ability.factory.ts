import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { AuthJwtAccessPayloadPermissionDto } from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';
import {
    ENUM_POLICY_REQUEST_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import { ENUM_POLICY_ACTION } from 'src/common/policy/constants/policy.enum.constant';
import {
    IPolicyAbility,
    IPolicyAbilityFlat,
    IPolicyRuleAbility,
    PolicyHandler,
} from 'src/common/policy/interfaces/policy.interface';

@Injectable()
export class PolicyAbilityFactory {
    defineAbilityFromRequest(permissions: AuthJwtAccessPayloadPermissionDto[]) {
        const { can, build } = new AbilityBuilder<IPolicyRuleAbility>(
            createMongoAbility
        );

        if (permissions.some(e => e.subject === ENUM_POLICY_SUBJECT.ALL)) {
            can(ENUM_POLICY_ACTION.MANAGE, 'all');
        } else {
            for (const permission of permissions) {
                const abilities = this.mappingAbilityFromRequest(permission);

                for (const ability of abilities) {
                    can(ability.action, ability.subject);
                }
            }
        }

        return build();
    }

    mappingAbilityFromRequest({
        subject,
        action,
    }: AuthJwtAccessPayloadPermissionDto): IPolicyAbilityFlat[] {
        return action
            .split(',')
            .map((val: string) => ({
                action: this.mappingAbility(Number.parseInt(val)),
                subject,
            }))
            .flat(1);
    }

    mappingAbility(action: number): ENUM_POLICY_ACTION {
        switch (action) {
            case ENUM_POLICY_REQUEST_ACTION.MANAGE:
                return ENUM_POLICY_ACTION.MANAGE;
            case ENUM_POLICY_REQUEST_ACTION.READ:
                return ENUM_POLICY_ACTION.READ;
            case ENUM_POLICY_REQUEST_ACTION.CREATE:
                return ENUM_POLICY_ACTION.CREATE;
            case ENUM_POLICY_REQUEST_ACTION.UPDATE:
                return ENUM_POLICY_ACTION.UPDATE;
            case ENUM_POLICY_REQUEST_ACTION.DELETE:
                return ENUM_POLICY_ACTION.DELETE;
            case ENUM_POLICY_REQUEST_ACTION.EXPORT:
                return ENUM_POLICY_ACTION.EXPORT;
            case ENUM_POLICY_REQUEST_ACTION.IMPORT:
                return ENUM_POLICY_ACTION.IMPORT;
            default:
                return null;
        }
    }

    handlerAbilities(abilities: IPolicyAbility[]): PolicyHandler[] {
        return abilities
            .map(({ subject, action }) => {
                return action
                    .map(
                        val => (ability: IPolicyRuleAbility) =>
                            ability.can(val, subject)
                    )
                    .flat(1);
            })
            .flat(1);
    }
}
