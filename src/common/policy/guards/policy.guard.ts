import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { POLICY_META_KEY } from 'src/common/policy/constants/policy.constant';
import { ENUM_POLICY_STATUS_CODE_ERROR } from 'src/common/policy/constants/policy.status-code.constant';
import { PolicyFactory } from 'src/common/policy/factories/policy.factory';
import {
    IPolicy,
    IPolicyRule,
    PolicyHandler,
} from 'src/common/policy/interfaces/policy.interface';
import { ENUM_ROLE_TYPE } from 'src/common/role/constants/role.enum.constant';

@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyFactory: PolicyFactory
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policy =
            this.reflector.get<IPolicy[]>(
                POLICY_META_KEY,
                context.getHandler()
            ) || [];

        const { user } = context.switchToHttp().getRequest<IRequestApp>();
        const { permissions, type } = user;

        if (type === ENUM_ROLE_TYPE.SUPER_ADMIN) {
            return true;
        }

        const ability = this.policyFactory.defineFromRequest(permissions);

        const policyHandler: PolicyHandler[] =
            this.policyFactory.handlerAbilities(policy);
        const check: boolean = policyHandler.every((handler: PolicyHandler) => {
            return this.execPolicyHandler(handler, ability);
        });

        if (!check) {
            throw new ForbiddenException({
                statusCode: ENUM_POLICY_STATUS_CODE_ERROR.FORBIDDEN_ERROR,
                message: 'policy.error.forbidden',
            });
        }

        return true;
    }

    private execPolicyHandler(handler: PolicyHandler, rule: IPolicyRule) {
        if (typeof handler === 'function') {
            return handler(rule);
        }
        return handler.handle(rule);
    }
}
