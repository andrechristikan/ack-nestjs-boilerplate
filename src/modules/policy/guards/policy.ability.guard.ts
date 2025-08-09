import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_POLICY_STATUS_CODE_ERROR } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { IPolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { POLICY_ABILITY_META_KEY } from '@modules/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';

@Injectable()
export class PolicyAbilityGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const abilities =
            this.reflector.get<IPolicyAbility[]>(
                POLICY_ABILITY_META_KEY,
                context.getHandler()
            ) || [];

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const { __user, user } = request;

        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { type } = user;

        if (type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
            return true;
        } else if (abilities.length === 0) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_PREDEFINED_NOT_FOUND,
                message: 'policy.error.abilityPredefinedNotFound',
            });
        }

        const userAbilities = this.policyAbilityFactory.createForUser(
            __user.role.permissions
        );
        const policyHandler = this.policyAbilityFactory.handlerAbilities(
            userAbilities,
            abilities
        );
        if (!policyHandler) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN,
                message: 'policy.error.abilityForbidden',
            });
        }

        request.__ability = userAbilities;

        return true;
    }
}
