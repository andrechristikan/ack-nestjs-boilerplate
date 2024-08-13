import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { AuthJwtAccessPayloadPermissionDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_REQUEST_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    IPolicyAbility,
    IPolicyAbilityFlat,
    IPolicyAbilityHandlerCallback,
    IPolicyAbilityRule,
} from 'src/modules/policy/interfaces/policy.interface';

@Injectable()
export class PolicyAbilityFactory {
    defineFromRequest(permissions: AuthJwtAccessPayloadPermissionDto[]) {
        const { can, build } = new AbilityBuilder<IPolicyAbilityRule>(
            createMongoAbility
        );

        if (permissions.some(e => e.subject === ENUM_POLICY_SUBJECT.ALL)) {
            can(ENUM_POLICY_ACTION.MANAGE, 'all');
        } else {
            for (const permission of permissions) {
                const abilities = this.mappingFromRequest(permission);

                for (const ability of abilities) {
                    can(ability.action, ability.subject);
                }
            }
        }

        return build();
    }

    mappingFromRequest({
        subject,
        action,
    }: AuthJwtAccessPayloadPermissionDto): IPolicyAbilityFlat[] {
        return action
            .split(',')
            .map((val: string) => ({
                action: this.mapping(Number.parseInt(val)),
                subject,
            }))
            .flat(1);
    }

    mapping(action: number): ENUM_POLICY_ACTION {
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

    handlerAbilities(
        abilities: IPolicyAbility[]
    ): IPolicyAbilityHandlerCallback[] {
        return abilities
            .map(({ subject, action }) => {
                return action
                    .map(
                        val => (ability: IPolicyAbilityRule) =>
                            ability.can(val, subject)
                    )
                    .flat(1);
            })
            .flat(1);
    }
}
