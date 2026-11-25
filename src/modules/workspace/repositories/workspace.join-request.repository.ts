import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import {
    EnumWorkspaceJoinRejectReason,
    EnumWorkspaceJoinRequestStatus,
} from '@generated/prisma-client/client';
import type {
    Prisma,
    WorkspaceJoinRequest,
} from '@generated/prisma-client/client';
import {
    WorkspaceJoinRequestRefSelect,
    WorkspaceJoinRequestWithUserRecipientInclude,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';
import type { IWorkspaceJoinRequestRepository } from '@modules/workspace/interfaces/workspace.join-request-repository.interface';
import type {
    IWorkspaceJoinRequestCreateData,
    IWorkspaceJoinRequestWithEmail,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceJoinRequestRepository implements IWorkspaceJoinRequestRepository {
    private readonly expireChunkSize: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly configService: ConfigService
    ) {
        this.expireChunkSize = this.configService.get<number>(
            'workspace.joinRequest.expireChunkSize'
        )!;
    }

    private async expireOne(id: string, today: Date): Promise<number> {
        const nonce = this.helperHashService.sha256Hash(id);
        const { count } =
            await this.databaseService.client.workspaceJoinRequest.updateMany({
                where: {
                    id,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                    expiredAt: {
                        lte: today,
                    },
                },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.expired,
                    nonce,
                },
            });

        return count;
    }

    private async cancelPendingInTx(
        tx: IDatabaseTransactionClient,
        filter: Prisma.WorkspaceJoinRequestWhereInput,
        updatedBy: string
    ): Promise<void> {
        const now = this.helperDateService.now();
        const pending = await tx.workspaceJoinRequest.findMany({
            where: {
                ...filter,
                status: EnumWorkspaceJoinRequestStatus.pending,
            },
            select: WorkspaceJoinRequestRefSelect,
        });

        await Promise.all(
            pending.map(({ id, expiredAt }) => {
                const nonce = this.helperHashService.sha256Hash(id);
                return tx.workspaceJoinRequest.updateMany({
                    where: {
                        id,
                        status: EnumWorkspaceJoinRequestStatus.pending,
                    },
                    data: {
                        status:
                            expiredAt <= now
                                ? EnumWorkspaceJoinRequestStatus.expired
                                : EnumWorkspaceJoinRequestStatus.canceled,
                        nonce,
                        updatedBy,
                    },
                });
            })
        );
    }

    async expireStalePending(): Promise<number> {
        const today = this.helperDateService.now();

        let total = 0;
        let fetched: number;
        do {
            // Sequential by design: a fan-out over an unbounded collection: bounded chunks in turn, each concurrent
            const stale =
                await this.databaseService.client.workspaceJoinRequest.findMany(
                    {
                        where: {
                            status: EnumWorkspaceJoinRequestStatus.pending,
                            expiredAt: {
                                lte: today,
                            },
                        },
                        select: WorkspaceJoinRequestRefSelect,
                        take: this.expireChunkSize,
                    }
                );
            const counts = await Promise.all(
                stale.map(({ id }) => this.expireOne(id, today))
            );
            total += counts.reduce((sum, count) => sum + count, 0);
            fetched = stale.length;
        } while (fetched === this.expireChunkSize);

        return total;
    }

    async findByIdAndWorkspace(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<IWorkspaceJoinRequestWithEmail | null> {
        return this.databaseService.client.workspaceJoinRequest.findFirst({
            where: {
                id: workspaceJoinRequestId,
                workspaceId,
            },
            include: WorkspaceJoinRequestWithUserRecipientInclude,
        });
    }

    async findWithPaginationCursor(
        workspaceId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        status: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<WorkspaceJoinRequest>> {
        return this.paginationService.cursor(
            this.databaseService.client.workspaceJoinRequest,
            {
                ...others,
                where: {
                    ...where,
                    ...(status ?? {}),
                    workspaceId,
                },
            }
        );
    }

    async createPendingInTx(
        tx: IDatabaseTransactionClient,
        {
            workspaceId,
            userId,
            message,
            expiredAt,
            nonce,
        }: IWorkspaceJoinRequestCreateData
    ): Promise<WorkspaceJoinRequest> {
        const now = this.helperDateService.now();
        const stale = await tx.workspaceJoinRequest.findFirst({
            where: {
                nonce,
                status: EnumWorkspaceJoinRequestStatus.pending,
                expiredAt: { lte: now },
            },
            select: WorkspaceJoinRequestRefSelect,
        });
        if (stale) {
            const staleNonce = this.helperHashService.sha256Hash(stale.id);
            await tx.workspaceJoinRequest.updateMany({
                where: {
                    id: stale.id,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.expired,
                    nonce: staleNonce,
                },
            });
        }

        try {
            return await tx.workspaceJoinRequest.create({
                data: {
                    workspaceId,
                    userId,
                    message,
                    expiredAt,
                    nonce,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toUniqueException(
                error,
                [
                    {
                        field: 'nonce',
                        exception: new WorkspaceJoinRequestDuplicateException(),
                    },
                ],
                new WorkspaceJoinRequestDuplicateException()
            );
        }
    }

    async acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        reviewerId: string,
        reviewedAt: Date
    ): Promise<IWorkspaceJoinRequestWithEmail> {
        const nonce = this.helperHashService.sha256Hash(workspaceJoinRequestId);
        try {
            return await tx.workspaceJoinRequest.update({
                where: {
                    id: workspaceJoinRequestId,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                    expiredAt: { gt: reviewedAt },
                },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.accepted,
                    nonce,
                    reviewedByUserId: reviewerId,
                    reviewedAt,
                },
                include: WorkspaceJoinRequestWithUserRecipientInclude,
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new WorkspaceJoinRequestAlreadyProcessedException()
            );
        }
    }

    async rejectInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        reviewerId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason,
        reviewedAt: Date
    ): Promise<WorkspaceJoinRequest> {
        const nonce = this.helperHashService.sha256Hash(workspaceJoinRequestId);
        try {
            return await tx.workspaceJoinRequest.update({
                where: {
                    id: workspaceJoinRequestId,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                    expiredAt: { gt: reviewedAt },
                },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.rejected,
                    nonce,
                    rejectReasonCode,
                    reviewedByUserId: reviewerId,
                    reviewedAt,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new WorkspaceJoinRequestAlreadyProcessedException()
            );
        }
    }

    async cancelPendingByWorkspacesInTx(
        tx: IDatabaseTransactionClient,
        workspaceIds: string[],
        updatedBy: string
    ): Promise<void> {
        await this.cancelPendingInTx(
            tx,
            { workspaceId: { in: workspaceIds } },
            updatedBy
        );
    }

    async cancelPendingByRequesterInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        updatedBy: string
    ): Promise<void> {
        await this.cancelPendingInTx(tx, { userId }, updatedBy);
    }

    async cancelPendingByUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number> {
        const now = this.helperDateService.now();
        const pending = await tx.workspaceJoinRequest.findFirst({
            where: {
                workspaceId,
                userId,
                status: EnumWorkspaceJoinRequestStatus.pending,
            },
            select: WorkspaceJoinRequestRefSelect,
        });
        if (!pending) {
            return 0;
        }

        const nonce = this.helperHashService.sha256Hash(pending.id);
        const { count } = await tx.workspaceJoinRequest.updateMany({
            where: {
                id: pending.id,
                status: EnumWorkspaceJoinRequestStatus.pending,
            },
            data: {
                status:
                    pending.expiredAt <= now
                        ? EnumWorkspaceJoinRequestStatus.expired
                        : EnumWorkspaceJoinRequestStatus.canceled,
                nonce,
            },
        });

        return count;
    }
}
