import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleService } from '@modules/role/services/role.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceResendInviteUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        IPolicyContext,
        string,
        WorkspaceInviteResendRequestDto,
    ],
    IResponseReturn<WorkspaceInvite>
> {
    constructor(
        private readonly roleService: RoleService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext,
        workspaceInviteId: string,
        { expiryDuration }: WorkspaceInviteResendRequestDto
    ): Promise<IResponseReturn<WorkspaceInvite>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.update,
            EnumPolicySubject.WorkspaceInvite
        );
        // Sequential by design: gate before the work it guards; write must not run if an earlier step throws
        const existing = await this.workspaceInviteService.getResendableById(
            workspaceInviteId,
            workspaceContext.workspace.id,
            additionalWhere
        );

        const [inviterName, existingUser, workspaceRole] = await Promise.all([
            this.workspaceInviteService.getInviterName(
                workspaceContext.workspace,
                authContext.userId
            ),
            this.userService.getOneActiveByEmail(existing.email),
            this.roleService.getRefByIdForScope(
                existing.workspaceRoleId,
                EnumRoleScope.workspace
            ),
        ]);

        const { invite } = await this.workspaceInviteService.resendInvite(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceInviteId,
            expiryDuration ?? null,
            {
                workspaceName: workspaceContext.workspace.name,
                workspaceRoleName: workspaceRole.name,
                inviterName,
                inviteeUserId: existingUser?.id ?? null,
            }
        );

        return { data: invite };
    }
}
