import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnumTermPolicyType } from '@generated/prisma-client';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * Blocks the route unless the current user has accepted the required term policies.
 */
@Injectable()
export class TermPolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly termPolicyService: TermPolicyService,
        private readonly requestStoreService: RequestStoreService
    ) {}

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
