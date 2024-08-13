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
import {
    IPolicyAbility,
    IPolicyAbilityHandlerCallback,
} from 'src/modules/policy/interfaces/policy.interface';
import { POLICY_ABILITY_META_KEY } from 'src/modules/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

@Injectable()
export class PolicyAbilityGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policy =
            this.reflector.get<IPolicyAbility[]>(
                POLICY_ABILITY_META_KEY,
                context.getHandler()
            ) || [];

        const { user } = context.switchToHttp().getRequest<IRequestApp>();
        const { permissions, type } = user;

        if (type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
            return true;
        } else if (policy.length === 0) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_PREDEFINED_NOT_FOUND,
                message: 'policy.error.abilityPredefinedNotFound',
            });
        }

        const ability =
            this.policyAbilityFactory.defineFromRequest(permissions);

        const policyHandler: IPolicyAbilityHandlerCallback[] =
            this.policyAbilityFactory.handlerAbilities(policy);
        const check: boolean = policyHandler.every(
            (handler: IPolicyAbilityHandlerCallback) => {
                return handler(ability);
            }
        );

        if (!check) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN,
                message: 'policy.error.abilityForbidden',
            });
        }

        return true;
    }
}
