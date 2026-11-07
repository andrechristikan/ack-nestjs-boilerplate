import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class TermPolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredTermPolicies = this.reflector.get<EnumTermPolicyType[]>(
            TermPolicyRequiredGuardMetaKey,
            context.getHandler()
        );

        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        if (!user) {
            throw new UserGuardMissingException();
        }

        await this.termPolicyAcceptanceService.validateTermPolicyGuard(
            user.id,
            requiredTermPolicies
        );

        return true;
    }
}
