import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
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
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceJoinRequest } from '@generated/prisma-client/client';
import type { IWorkspaceJoinRequestRepository } from '@modules/workspace/interfaces/workspace.join-request-repository.interface';
import type { IWorkspaceJoinRequestCreateData } from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceJoinRequestRepository implements IWorkspaceJoinRequestRepository {
    private readonly expireChunkSize: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly configService: ConfigService
    ) {
        this.expireChunkSize = this.configService.get<number>(
            'workspace.joinRequest.expireChunkSize'
        )!;
    }

    private async expireOne(id: string): Promise<number> {
        const nonce = this.helperHashService.sha256Hash(id);
        const { count } =
            await this.databaseService.client.workspaceJoinRequest.updateMany({
                where: {
                    id,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.expired,
                    nonce,
                },
            });

        return count;
    }

    /** Flips truly-expired `pending` join requests to `expired`, each row's `nonce` becoming the digest of its id; returns the count updated. */
    async expireStalePending(): Promise<number> {
        const today = this.helperDateService.create();

        let total = 0;
        let fetched: number;
        do {
            // Sequential by design: fan-out over an unbounded collection runs in bounded chunks
            const stale =
                await this.databaseService.client.workspaceJoinRequest.findMany(
                    {
                        where: {
                            status: EnumWorkspaceJoinRequestStatus.pending,
                            expiredAt: {
                                lt: today,
                            },
                        },
                        select: { id: true },
                        take: this.expireChunkSize,
                    }
                );
            const counts = await Promise.all(
                stale.map(({ id }) => this.expireOne(id))
            );
            total += counts.reduce((sum, count) => sum + count, 0);
            fetched = stale.length;
        } while (fetched === this.expireChunkSize);

        return total;
    }

    async findByIdAndWorkspace(
        workspaceJoinRequestId: string,
        workspaceId: string
    ): Promise<WorkspaceJoinRequest | null> {
        return this.databaseService.client.workspaceJoinRequest.findFirst({
            where: {
                id: workspaceJoinRequestId,
                workspaceId,
            },
        });
    }

    async findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceJoinRequestWhereInput>,
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

    async createPending({
        workspaceId,
        userId,
        message,
        expiredAt,
        nonce,
    }: IWorkspaceJoinRequestCreateData): Promise<WorkspaceJoinRequest> {
        const now = this.helperDateService.create();

        return this.databaseService.withTransaction(async tx => {
            const stale = await tx.workspaceJoinRequest.findFirst({
                where: {
                    nonce,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                    expiredAt: { lt: now },
                },
                select: { id: true },
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

            return tx.workspaceJoinRequest.create({
                data: {
                    workspaceId,
                    userId,
                    message,
                    expiredAt,
                    nonce,
                },
            });
        });
    }

    async acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceJoinRequestId: string,
        nonce: string,
        reviewerId: string,
        reviewedAt: Date
    ): Promise<boolean> {
        const { count } = await tx.workspaceJoinRequest.updateMany({
            where: {
                id: workspaceJoinRequestId,
                status: EnumWorkspaceJoinRequestStatus.pending,
                expiredAt: { gte: reviewedAt },
            },
            data: {
                status: EnumWorkspaceJoinRequestStatus.accepted,
                nonce,
                reviewedByUserId: reviewerId,
                reviewedAt,
            },
        });

        return count > 0;
    }

    async reject(
        workspaceJoinRequestId: string,
        nonce: string,
        reviewerId: string,
        rejectReasonCode: EnumWorkspaceJoinRejectReason,
        reviewedAt: Date
    ): Promise<boolean> {
        const { count } =
            await this.databaseService.client.workspaceJoinRequest.updateMany({
                where: {
                    id: workspaceJoinRequestId,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                    expiredAt: { gte: reviewedAt },
                },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.rejected,
                    nonce,
                    rejectReasonCode,
                    reviewedByUserId: reviewerId,
                    reviewedAt,
                },
            });

        return count > 0;
    }

    async cancelPendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        const pending = await tx.workspaceJoinRequest.findMany({
            where: {
                workspaceId,
                status: EnumWorkspaceJoinRequestStatus.pending,
            },
            select: { id: true },
        });

        for (const { id } of pending) {
            const nonce = this.helperHashService.sha256Hash(id);
            await tx.workspaceJoinRequest.updateMany({
                where: {
                    id,
                    status: EnumWorkspaceJoinRequestStatus.pending,
                },
                data: {
                    status: EnumWorkspaceJoinRequestStatus.cancelled,
                    nonce,
                },
            });
        }
    }

    async cancelPendingByUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number> {
        const pending = await tx.workspaceJoinRequest.findFirst({
            where: {
                workspaceId,
                userId,
                status: EnumWorkspaceJoinRequestStatus.pending,
            },
            select: { id: true },
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
                status: EnumWorkspaceJoinRequestStatus.cancelled,
                nonce,
            },
        });

        return count;
    }
}
