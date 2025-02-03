import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_POLICY_STATUS_CODE_ERROR } from 'src/modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from 'src/modules/policy/factories/policy.factory';
import { IPolicyAbility } from 'src/modules/policy/interfaces/policy.interface';
import { POLICY_ABILITY_META_KEY } from 'src/modules/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';

@Injectable()
export class PolicyAbilityGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policies =
            this.reflector.get<IPolicyAbility[]>(
                POLICY_ABILITY_META_KEY,
                context.getHandler()
            ) || [];

        const { __user, user } = context
            .switchToHttp()
            .getRequest<IRequestApp>();

        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.JWT_ACCESS_TOKEN,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { type } = user;

        if (type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
            return true;
        } else if (policies.length === 0) {
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
            policies
        );
        if (!policyHandler) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN,
                message: 'policy.error.abilityForbidden',
            });
        }

        return true;
    }
}
