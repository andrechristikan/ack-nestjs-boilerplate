import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class DeviceRemoveByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        IPolicyContext,
        string,
        string,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly sessionService: SessionService,
        private readonly roleService: RoleService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        policyContext: IPolicyContext,
        userId: string,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.User
        );
        const ownershipWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.delete,
            EnumPolicySubject.DeviceOwnership
        );
        const targetRole = await this.roleService.getOneByUserId(
            userId,
            additionalWhere
        );
        this.roleService.assertActorOutranks(
            userContext.user.role.key,
            targetRole
        );

        await this.sessionService.removeDeviceOwnershipByAdmin(
            requestContext,
            apiKeyContext,
            authContext,
            userId,
            deviceOwnershipId,
            ownershipWhere
        );

        return {};
    }
}
