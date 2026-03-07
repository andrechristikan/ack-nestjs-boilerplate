import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { PolicyAuthorizeMetaKey } from '@modules/policy/constants/policy.constant';
import { IPolicyRequirement } from '@modules/policy/interfaces/policy.interface';
import { PolicyService } from '@modules/policy/services/policy.service';

/**
 * Guard that validates user access based on policy abilities and permissions
 */
@Injectable()
export class PolicyAbilityGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyService: PolicyService
    ) {}

    /**
     * Validates if the current user has the required abilities to access the resource
     * @param {ExecutionContext} context - NestJS execution context containing request information
     * @returns {Promise<boolean>} Promise that resolves to true if user has required abilities
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredAbilities =
            this.reflector.getAllAndOverride<IPolicyRequirement[]>(
                PolicyAuthorizeMetaKey,
                [context.getHandler(), context.getClass()]
            ) ?? [];

        const request = context.switchToHttp().getRequest<IRequestApp>();
        request.__abilities = this.policyService.validatePolicyGuard(
            request,
            requiredAbilities
        );

        return true;
    }
}
