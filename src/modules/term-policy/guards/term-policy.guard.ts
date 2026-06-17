import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnumTermPolicyType } from '@generated/prisma-client';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * Guard that validates user acceptance of required term policies.
 * Checks if the user has accepted all required term policies before allowing access to protected routes.
 */
@Injectable()
export class TermPolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly termPolicyService: TermPolicyService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    /**
     * Validates if the user has accepted all required term policies.
     * Extracts required term policies from metadata and validates user acceptance.
     *
     * @param {ExecutionContext} context - The execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if all required term policies are accepted
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredTermPolicies = this.reflector.get<EnumTermPolicyType[]>(
            TermPolicyRequiredGuardMetaKey,
            context.getHandler()
        );

        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        await this.termPolicyService.validateTermPolicyGuard(
            user,
            requiredTermPolicies
        );

        return true;
    }
}
