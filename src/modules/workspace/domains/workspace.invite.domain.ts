import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
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
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import type { IUserSignUpWorkspaceInvite } from '@modules/user/interfaces/user.interface';
import { WorkspaceInviteNoncePattern } from '@modules/workspace/constants/workspace.constant';
import type { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import type {
    IWorkspaceInviteCreate,
    IWorkspaceInviteIssued,
    IWorkspaceInviteList,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceInviteDomain {
    private readonly referenceMaxAttempts: number;

    constructor(
        private readonly workspaceInviteRepository: WorkspaceInviteRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.referenceMaxAttempts = this.configService.get<number>(
            'workspace.invite.referenceMaxAttempts'
        )!;
    }

    /** Gates on `workspace.invitationAllowed`, then reads the pending invite of a token. */
    async validateInviteToken(token: string): Promise<WorkspaceInvite> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.invitationAllowed
        );
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

    /** Reads the pending invite of a token that belongs to the email. */
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

    /** Reads the invite a sign-up carries; null when it carries no token. */
    async getSignUpInvite(
        token: string | null,
        email: string
    ): Promise<WorkspaceInvite | null> {
        if (!token) {
            return null;
        }

        return this.validateInviteForEmail(token, email);
    }

    async assertInviteeNotMember(
        workspaceId: string,
        userId: string
    ): Promise<void> {
        const existingMember =
            await this.workspaceMemberDomain.getOneByWorkspaceAndUser(
                workspaceId,
                userId
            );
        if (existingMember) {
            throw new WorkspaceMemberAlreadyExistsException();
        }
    }

    async expireStalePending(): Promise<number> {
        return this.workspaceInviteRepository.expireStalePending();
    }

    async revokePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        await this.workspaceInviteRepository.revokePendingByWorkspaceInTx(
            tx,
            workspaceId
        );
    }

    async revokePendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        email: string
    ): Promise<void> {
        await this.workspaceInviteRepository.revokePendingByEmailInTx(
            tx,
            workspaceId,
            email
        );
    }

    async clearProjectInTx(
        tx: IDatabaseTransactionClient,
        projectId: string
    ): Promise<void> {
        await this.workspaceInviteRepository.clearProjectInTx(tx, projectId);
    }

    async getInvitesList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceInviteList>> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.invitationAllowed
        );

        return this.workspaceInviteRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            status ?? null
        );
    }

    /** Gates on `workspace.invitationAllowed`, then asserts the project id and role come together. */
    async assertProjectRolePaired({
        projectId,
        projectRole,
    }: IWorkspaceInviteCreate): Promise<void> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.invitationAllowed
        );
        const hasProjectId = projectId !== null;
        const hasProjectRole = projectRole !== null;
        if (hasProjectId !== hasProjectRole) {
            throw new WorkspaceInviteRoleRequiredException();
        }
    }

    assertCreatable(
        { projectId }: IWorkspaceInviteCreate,
        project: Project | null
    ): void {
        if (projectId !== null && !project) {
            throw new WorkspaceInviteProjectMismatchException();
        }
    }

    async createInvite(
        workspaceId: string,
        actorId: string,
        create: IWorkspaceInviteCreate
    ): Promise<IWorkspaceInviteIssued> {
        const workspaceInviteId = this.databaseUtil.createId();
        const noncePattern = this.helperStringService.fillPattern(
            WorkspaceInviteNoncePattern,
            { workspaceId, email: create.email }
        );
        const nonce = this.helperHashService.sha256Hash(noncePattern);

        for (let attempt = 0; attempt < this.referenceMaxAttempts; attempt++) {
            const tokenData = this.workspaceUtil.createInviteTokenData(
                create.expiryDuration
            );

            try {
                const invite =
                    await this.workspaceInviteRepository.createPending({
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
                        nonce,
                    });

                return { invite, tokenData };
            } catch (err: unknown) {
                const isDuplicate = this.databaseUtil.isUniqueCollision(
                    err,
                    'nonce'
                );
                if (isDuplicate) {
                    throw new WorkspaceInviteDuplicateException();
                }

                const isTokenCollision = this.databaseUtil.isUniqueCollision(
                    err,
                    'token'
                );
                const isReferenceCollision =
                    this.databaseUtil.isUniqueCollision(err, 'reference');
                if (isTokenCollision || isReferenceCollision) {
                    continue;
                }

                if (err instanceof AppBaseException) {
                    throw err;
                }

                const mapped = this.databaseUtil.toException(err);
                if (mapped instanceof DatabaseWriteConflictException) {
                    throw new WorkspaceInviteDuplicateException();
                }

                throw new AppUnknownException(err);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    /** Gates on `workspace.invitationAllowed`, then reads the pending invite of the workspace. */
    async getPendingById(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.workspace,
            EnumFeatureFlagMetadataKey.invitationAllowed
        );
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

    async getResendableById(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite> {
        const existing = await this.getPendingById(
            workspaceInviteId,
            workspaceId
        );
        const now = this.helperDateService.create();
        if (existing.expiredAt <= now) {
            throw new WorkspaceInviteInvalidException();
        }

        return existing;
    }

    async resendInvite(
        workspaceInviteId: string,
        expiryDuration: EnumWorkspaceInviteExpiry | null
    ): Promise<IWorkspaceInviteIssued> {
        const resentAt = this.helperDateService.create();

        for (let attempt = 0; attempt < this.referenceMaxAttempts; attempt++) {
            const tokenData =
                this.workspaceUtil.createInviteTokenData(expiryDuration);

            try {
                const invite =
                    await this.workspaceInviteRepository.rotateForResend(
                        workspaceInviteId,
                        tokenData.hashedToken,
                        tokenData.reference,
                        tokenData.expiredAt,
                        resentAt
                    );
                if (!invite) {
                    throw new WorkspaceInviteAlreadyProcessedException();
                }

                return { invite, tokenData };
            } catch (err: unknown) {
                if (err instanceof AppBaseException) {
                    throw err;
                }

                const isTokenCollision = this.databaseUtil.isUniqueCollision(
                    err,
                    'token'
                );
                const isReferenceCollision =
                    this.databaseUtil.isUniqueCollision(err, 'reference');
                if (isTokenCollision || isReferenceCollision) {
                    continue;
                }

                const mapped = this.databaseUtil.toException(err);
                if (mapped instanceof DatabaseWriteConflictException) {
                    throw new WorkspaceInviteAlreadyProcessedException();
                }

                throw new AppUnknownException(err);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
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

        await this.acceptPendingInTx(
            tx,
            context.workspaceInviteId,
            userId,
            acceptedAt
        );
        await this.workspaceMemberDomain.createInTx(
            tx,
            context.workspaceId,
            userId,
            context.workspaceMemberRole,
            userId
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
