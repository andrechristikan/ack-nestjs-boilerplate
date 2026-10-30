import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceInviteStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    Project,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import type { IUserSignUpWorkspaceInvite } from '@modules/user/interfaces/user.interface';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteList,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceInviteDomain {
    constructor(
        private readonly workspaceInviteRepository: WorkspaceInviteRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService
    ) {}

    async validateInviteToken(token: string): Promise<WorkspaceInvite> {
        const hashedToken = this.helperHashService.sha256Hash(token);
        const invite =
            await this.workspaceInviteRepository.findPendingByHashedToken(
                hashedToken
            );
        if (!invite) {
            throw new WorkspaceInviteInvalidException();
        }

        return invite;
    }

    /** Reads the pending invite of a token that belongs to the sign-up email. */
    async validateInviteForEmail(
        token: string,
        email: string
    ): Promise<WorkspaceInvite> {
        const invite = await this.validateInviteToken(token);
        const isEmailMatch = this.workspaceUtil.isInviteEmailMatch(
            invite.email,
            email
        );
        if (!isEmailMatch) {
            throw new WorkspaceInviteInvalidException();
        }

        return invite;
    }

    async expireStalePending(): Promise<number> {
        return this.workspaceInviteRepository.expireStalePending();
    }

    async expirePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        await this.workspaceInviteRepository.expirePendingByWorkspaceInTx(
            tx,
            workspaceId
        );
    }

    async getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        return this.workspaceInviteRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            status ?? null
        );
    }

    assertProjectRolePaired({
        projectId,
        projectRole,
    }: IWorkspaceInviteCreate): void {
        const hasProjectId = projectId !== null;
        const hasProjectRole = projectRole !== null;
        if (hasProjectId !== hasProjectRole) {
            throw new WorkspaceInviteRoleRequiredException();
        }
    }

    async existsPendingByEmail(
        workspaceId: string,
        email: string
    ): Promise<boolean> {
        return this.workspaceInviteRepository.existsPendingByWorkspaceAndEmail(
            workspaceId,
            email
        );
    }

    assertCreatable(
        { projectId }: IWorkspaceInviteCreate,
        project: Project | null,
        duplicate: boolean
    ): void {
        if (projectId !== null && !project) {
            throw new WorkspaceInviteProjectMismatchException();
        } else if (duplicate) {
            throw new WorkspaceInviteDuplicateException();
        }
    }

    async createInvite(
        workspaceId: string,
        actorId: string,
        create: IWorkspaceInviteCreate,
        tokenData: IWorkspaceInviteTokenData
    ): Promise<WorkspaceInvite> {
        const workspaceInviteId = this.databaseUtil.createId();

        return this.workspaceInviteRepository.createPending({
            workspaceInviteId,
            workspaceId,
            email: create.email,
            workspaceRole: create.workspaceRole,
            projectId: create.projectId,
            projectRole: create.projectRole,
            hashedToken: tokenData.hashedToken,
            reference: tokenData.reference,
            expiredAt: tokenData.expiredAt,
            invitedByUserId: actorId,
        });
    }

    async getPendingById(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite> {
        const existing =
            await this.workspaceInviteRepository.findByIdAndWorkspace(
                workspaceInviteId,
                workspaceId
            );
        if (!existing) {
            throw new WorkspaceInviteNotFoundException();
        } else if (existing.status !== EnumWorkspaceInviteStatus.pending) {
            throw new WorkspaceInviteAlreadyProcessedException();
        }

        return existing;
    }

    async resendInvite(
        workspaceInviteId: string,
        tokenData: IWorkspaceInviteTokenData
    ): Promise<WorkspaceInvite> {
        try {
            const invite = await this.workspaceInviteRepository.rotateForResend(
                workspaceInviteId,
                tokenData.hashedToken,
                tokenData.reference,
                tokenData.expiredAt
            );
            if (!invite) {
                throw new WorkspaceInviteAlreadyProcessedException();
            }

            return invite;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceInviteAlreadyProcessedException();
            }

            throw new AppUnknownException(err);
        }
    }

    async revokeInvite(workspaceInviteId: string): Promise<void> {
        const revoked =
            await this.workspaceInviteRepository.revoke(workspaceInviteId);
        if (!revoked) {
            throw new WorkspaceInviteAlreadyProcessedException();
        }
    }

    async acceptPendingInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<void> {
        try {
            const accepted = await this.workspaceInviteRepository.acceptInTx(
                tx,
                workspaceInviteId,
                userId,
                acceptedAt
            );
            if (!accepted) {
                throw new WorkspaceInviteAlreadyProcessedException();
            }
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceInviteAlreadyProcessedException();
            }

            throw new AppUnknownException(err);
        }
    }

    async acceptOnSignUpInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        context: IUserSignUpWorkspaceInvite
    ): Promise<void> {
        const acceptedAt = this.helperDateService.create();

        await this.workspaceMemberDomain.createInTx(
            tx,
            context.workspaceId,
            userId,
            context.workspaceMemberRole,
            userId
        );
        await this.acceptPendingInTx(
            tx,
            context.workspaceInviteId,
            userId,
            acceptedAt
        );
    }

    async getWorkspaceOfInvite(invite: WorkspaceInvite): Promise<Workspace> {
        const workspace = await this.workspaceRepository.findActiveById(
            invite.workspaceId
        );
        if (!workspace) {
            throw new WorkspaceInviteInvalidException();
        }

        return workspace;
    }
}
