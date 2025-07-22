import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { Reflector } from '@nestjs/core';
import { TERM_POLICY_ACCEPTANCE_GUARD_META_KEY } from '@modules/term-policy/constants/term-policy.constant';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@modules/auth/enums/auth.status-code.enum';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';

@Injectable()
export class TermPolicyGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const types =
            this.reflector.get<ENUM_TERM_POLICY_TYPE[]>(
                TERM_POLICY_ACCEPTANCE_GUARD_META_KEY,
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

        const { termPolicy } = user;
        if (types.length === 0) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_TERM_POLICY_STATUS_CODE_ERROR.PREDEFINED_REQUIRED_ACCEPTANCE_NOT_FOUND,
                message:
                    'termPolicy.error.predefinedRequiredAcceptanceNotFound',
            });
        } else if (types.some(type => !termPolicy[type])) {
            throw new ForbiddenException({
                statusCode:
                    ENUM_TERM_POLICY_STATUS_CODE_ERROR.REQUIRED_ACCEPTANCE,
                message: 'termPolicy.error.requiredAcceptance',
            });
        }

        return true;
    }
}
