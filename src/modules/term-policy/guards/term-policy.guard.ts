import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { Reflector } from '@nestjs/core';
import { ENUM_TERM_POLICY_TYPE } from '@prisma/client';
import { TERM_POLICY_REQUIRED_GUARD_META_KEY } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';

/**
 * Guard that validates user acceptance of required term policies.
 * Checks if the user has accepted all required term policies before allowing access to protected routes.
 */
@Injectable()
export class TermPolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly termPolicyService: TermPolicyService
    ) {}

    /**
     * Validates if the user has accepted all required term policies.
     * Extracts required term policies from metadata and validates user acceptance.
     *
     * @param {ExecutionContext} context - The execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if all required term policies are accepted
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredTermPolicies =
            this.reflector.get<ENUM_TERM_POLICY_TYPE[]>(
                TERM_POLICY_REQUIRED_GUARD_META_KEY,
                context.getHandler()
            ) ?? [];

        const request = context.switchToHttp().getRequest<IRequestApp>();
        await this.termPolicyService.validateTermPolicyGuard(
            request,
            requiredTermPolicies
        );

        return true;
    }
}
