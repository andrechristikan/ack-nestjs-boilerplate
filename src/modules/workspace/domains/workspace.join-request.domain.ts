import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
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
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    Workspace,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import { WorkspaceJoinRequestNoncePattern } from '@modules/workspace/constants/workspace.constant';
import { WorkspaceJoinRequestAlreadyMemberException } from '@modules/workspace/exceptions/workspace.join-request-already-member.exception';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import { WorkspaceJoinRequestNotFoundException } from '@modules/workspace/exceptions/workspace.join-request-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceNotPublicException } from '@modules/workspace/exceptions/workspace.not-public.exception';
import type { IWorkspaceJoinRequestCreate } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceJoinRequestDomain {
    private readonly expiresInMs: number;

    constructor(
        private readonly workspaceJoinRequestRepository: WorkspaceJoinRequestRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly configService: ConfigService
    ) {
        this.expiresInMs = this.configService.get<number>(
            'workspace.joinRequest.expiresInMs'
        )!;
    }

    async getJoinableWorkspace(
        userId: string,
        workspaceId: string
    ): Promise<Workspace> {
        const workspace =
            await this.workspaceRepository.findActiveById(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        } else if (!workspace.isPublic) {
            throw new WorkspaceNotPublicException();
        }

        const existingMember =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspace.id,
                userId
            );
        if (existingMember) {
            throw new WorkspaceJoinRequestAlreadyMemberException();
        }

        return workspace;
    }

    async createJoinRequest(
        userId: string,
        create: IWorkspaceJoinRequestCreate
    ): Promise<WorkspaceJoinRequest> {
        const noncePattern = this.helperStringService.fillPattern(
            WorkspaceJoinRequestNoncePattern,
            { workspaceId: create.workspaceId, userId }
        );
        const nonce = this.helperHashService.sha256Hash(noncePattern);
        const now = this.helperDateService.create();
        const duration = this.helperDateService.createDuration({
            milliseconds: this.expiresInMs,
        });
        const expiredAt = this.helperDateService.forward(now, duration);

        try {
            return await this.workspaceJoinRequestRepository.createPending({
                workspaceId: create.workspaceId,
                userId,
                message: create.message,
                expiredAt,
                nonce,
            });
        } catch (err: unknown) {
            const isDuplicate = this.databaseUtil.isUniqueCollision(
                err,
                'nonce'
            );
            if (isDuplicate) {
                throw new WorkspaceJoinRequestDuplicateException();
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceJoinRequestDuplicateException();
            }

            throw new AppUnknownException(err);
        }
    }

    async getJoinRequestsList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput>,
        status?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<WorkspaceJoinRequest>> {
        return this.workspaceJoinRequestRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            status ?? null
        );
    }

    async getPendingById(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<WorkspaceJoinRequest> {
        const joinRequest =
            await this.workspaceJoinRequestRepository.findByIdAndWorkspace(
                workspaceJoinRequestId,
                workspaceId
            );
        if (!joinRequest) {
            throw new WorkspaceJoinRequestNotFoundException();
        } else if (
            joinRequest.status !== EnumWorkspaceJoinRequestStatus.pending
        ) {
            throw new WorkspaceJoinRequestAlreadyProcessedException();
        }

        return joinRequest;
    }

    async acceptJoinRequest(
        joinRequest: WorkspaceJoinRequest,
        reviewerId: string
    ): Promise<void> {
        const reviewedAt = this.helperDateService.create();

        try {
            await this.databaseService.withTransaction(async tx => {
                const accepted =
                    await this.workspaceJoinRequestRepository.acceptInTx(
                        tx,
                        joinRequest.id,
                        reviewerId,
                        reviewedAt
                    );
                if (!accepted) {
                    throw new WorkspaceJoinRequestAlreadyProcessedException();
                }

                await this.workspaceMemberDomain.createInTx(
                    tx,
                    joinRequest.workspaceId,
                    joinRequest.userId,
                    EnumWorkspaceMemberRole.member,
                    reviewerId
                );
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isAlreadyMember = this.databaseUtil.isUniqueCollision(
                err,
                'userId'
            );
            if (isAlreadyMember) {
                throw new WorkspaceJoinRequestAlreadyMemberException();
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceJoinRequestAlreadyProcessedException();
            }

            throw new AppUnknownException(err);
        }
    }

    async rejectJoinRequest(
        workspaceJoinRequestId: string,
        reviewerId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason
    ): Promise<void> {
        const reviewedAt = this.helperDateService.create();

        const rejected = await this.workspaceJoinRequestRepository.reject(
            workspaceJoinRequestId,
            reviewerId,
            rejectReasonCode,
            reviewedAt
        );
        if (!rejected) {
            throw new WorkspaceJoinRequestAlreadyProcessedException();
        }
    }

    async expireStalePending(): Promise<number> {
        return this.workspaceJoinRequestRepository.expireStalePending();
    }

    async cancelPendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        await this.workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx(
            tx,
            workspaceId
        );
    }

    async cancelPendingByRequesterInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.workspaceJoinRequestRepository.cancelPendingByRequesterInTx(
            tx,
            userId
        );
    }

    async cancelPendingByUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number> {
        return this.workspaceJoinRequestRepository.cancelPendingByUserInTx(
            tx,
            workspaceId,
            userId
        );
    }
}
