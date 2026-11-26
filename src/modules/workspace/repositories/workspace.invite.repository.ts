import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { WorkspaceInviteDatabaseErrorContract } from '@modules/workspace/contracts/workspace.invite.database-error.contract';
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
import { EnumWorkspaceInviteStatus } from '@generated/prisma-client/client';
import type { Prisma, WorkspaceInvite } from '@generated/prisma-client/client';
import {
    WorkspaceInvitePreviewInclude,
    WorkspaceInviteRefSelect,
    WorkspaceInviteUserListSelect,
} from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceInviteRepository } from '@modules/workspace/interfaces/workspace.invite-repository.interface';
import type {
    IWorkspaceInviteCreateData,
    IWorkspaceInviteList,
    IWorkspaceInvitePreview,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceInviteRepository
    extends DatabaseRepositoryBase
    implements IWorkspaceInviteRepository
{
    private readonly expireChunkSize: number;

    protected override readonly errorContract =
        WorkspaceInviteDatabaseErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        protected override readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly paginationService: PaginationService,
        private readonly configService: ConfigService
    ) {
        super();

        this.expireChunkSize = this.configService.get<number>(
            'workspace.invite.expireChunkSize'
        )!;
    }

    private async expireOne(id: string, today: Date): Promise<number> {
        const nonce = this.helperHashService.sha256Hash(id);
        const { count } =
            await this.databaseService.client.workspaceInvite.updateMany({
                where: {
                    id,
                    status: EnumWorkspaceInviteStatus.pending,
                    expiredAt: {
                        lte: today,
                    },
                },
                data: {
                    status: EnumWorkspaceInviteStatus.expired,
                    nonce,
                },
            });

        return count;
    }

    private async revokePendingInTx(
        tx: IDatabaseTransactionClient,
        filter: Prisma.WorkspaceInviteWhereInput,
        updatedBy: string
    ): Promise<void> {
        const now = this.helperDateService.now();
        const pending = await tx.workspaceInvite.findMany({
            where: {
                ...filter,
                status: EnumWorkspaceInviteStatus.pending,
            },
            select: WorkspaceInviteRefSelect,
        });

        await Promise.all(
            pending.map(({ id, expiredAt }) => {
                const nonce = this.helperHashService.sha256Hash(id);
                return tx.workspaceInvite.updateMany({
                    where: {
                        id,
                        status: EnumWorkspaceInviteStatus.pending,
                    },
                    data: {
                        status:
                            expiredAt <= now
                                ? EnumWorkspaceInviteStatus.expired
                                : EnumWorkspaceInviteStatus.revoked,
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
                await this.databaseService.client.workspaceInvite.findMany({
                    where: {
                        status: EnumWorkspaceInviteStatus.pending,
                        expiredAt: {
                            lte: today,
                        },
                    },
                    select: WorkspaceInviteRefSelect,
                    take: this.expireChunkSize,
                });
            const counts = await Promise.all(
                stale.map(({ id }) => this.expireOne(id, today))
            );
            total += counts.reduce((sum, count) => sum + count, 0);
            fetched = stale.length;
        } while (fetched === this.expireChunkSize);

        return total;
    }

    async revokePendingByWorkspacesInTx(
        tx: IDatabaseTransactionClient,
        workspaceIds: string[],
        updatedBy: string
    ): Promise<void> {
        await this.revokePendingInTx(
            tx,
            { workspaceId: { in: workspaceIds } },
            updatedBy
        );
    }

    async revokePendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        email: string
    ): Promise<void> {
        const now = this.helperDateService.now();
        const pending = await tx.workspaceInvite.findFirst({
            where: {
                workspaceId,
                email,
                status: EnumWorkspaceInviteStatus.pending,
            },
            select: WorkspaceInviteRefSelect,
        });
        if (!pending) {
            return;
        }

        const nonce = this.helperHashService.sha256Hash(pending.id);
        await tx.workspaceInvite.updateMany({
            where: {
                id: pending.id,
                status: EnumWorkspaceInviteStatus.pending,
            },
            data: {
                status:
                    pending.expiredAt <= now
                        ? EnumWorkspaceInviteStatus.expired
                        : EnumWorkspaceInviteStatus.revoked,
                nonce,
            },
        });
    }

    async revokeAllPendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        email: string,
        updatedBy: string
    ): Promise<void> {
        await this.revokePendingInTx(tx, { email }, updatedBy);
    }

    async clearProjectInTx(
        tx: IDatabaseTransactionClient,
        projectId: string
    ): Promise<void> {
        await tx.workspaceInvite.updateMany({
            where: {
                projectId,
                status: EnumWorkspaceInviteStatus.pending,
            },
            data: {
                projectId: null,
                projectRole: null,
            },
        });
    }

    async findPendingByHashedToken(
        hashedToken: string
    ): Promise<IWorkspaceInvitePreview | null> {
        const today = this.helperDateService.now();

        return this.databaseService.client.workspaceInvite.findFirst({
            where: {
                token: hashedToken,
                status: EnumWorkspaceInviteStatus.pending,
                expiredAt: {
                    gt: today,
                },
            },
            include: WorkspaceInvitePreviewInclude,
        });
    }

    async findByIdAndWorkspace(
        workspaceInviteId: string,
        workspaceId: string
    ): Promise<WorkspaceInvite | null> {
        return this.databaseService.client.workspaceInvite.findFirst({
            where: {
                id: workspaceInviteId,
                workspaceId,
            },
        });
    }

    async findWithPaginationCursor(
        workspaceId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        status: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<IWorkspaceInviteList>> {
        return this.paginationService.cursor(
            this.databaseService.client.workspaceInvite,
            {
                ...others,
                where: {
                    ...where,
                    ...(status ?? {}),
                    workspaceId,
                },
                select: WorkspaceInviteUserListSelect,
            }
        );
    }

    async createPendingInTx(
        tx: IDatabaseTransactionClient,
        {
            workspaceInviteId,
            workspaceId,
            email,
            workspaceRole,
            projectId,
            projectRole,
            hashedToken,
            reference,
            expiredAt,
            invitedByUserId,
            nonce,
        }: IWorkspaceInviteCreateData
    ): Promise<IWorkspaceInviteList> {
        const now = this.helperDateService.now();
        const stale = await tx.workspaceInvite.findFirst({
            where: {
                nonce,
                status: EnumWorkspaceInviteStatus.pending,
                expiredAt: { lte: now },
            },
            select: WorkspaceInviteRefSelect,
        });
        if (stale) {
            const staleNonce = this.helperHashService.sha256Hash(stale.id);
            await tx.workspaceInvite.updateMany({
                where: {
                    id: stale.id,
                    status: EnumWorkspaceInviteStatus.pending,
                },
                data: {
                    status: EnumWorkspaceInviteStatus.expired,
                    nonce: staleNonce,
                },
            });
        }

        try {
            return await tx.workspaceInvite.create({
                data: {
                    id: workspaceInviteId,
                    workspaceId,
                    email,
                    workspaceRole,
                    projectId,
                    projectRole,
                    token: hashedToken,
                    reference,
                    expiredAt,
                    invitedByUserId,
                    nonce,
                },
                select: WorkspaceInviteUserListSelect,
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async rotateForResendInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        hashedToken: string,
        reference: string,
        expiredAt: Date,
        resentAt: Date
    ): Promise<IWorkspaceInviteList> {
        try {
            return await tx.workspaceInvite.update({
                where: {
                    id: workspaceInviteId,
                    status: EnumWorkspaceInviteStatus.pending,
                    expiredAt: {
                        gt: resentAt,
                    },
                },
                data: {
                    token: hashedToken,
                    reference,
                    expiredAt,
                },
                select: WorkspaceInviteUserListSelect,
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async revokeInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string
    ): Promise<boolean> {
        const nonce = this.helperHashService.sha256Hash(workspaceInviteId);
        try {
            const { count } = await tx.workspaceInvite.updateMany({
                where: {
                    id: workspaceInviteId,
                    status: EnumWorkspaceInviteStatus.pending,
                },
                data: {
                    status: EnumWorkspaceInviteStatus.revoked,
                    nonce,
                },
            });

            return count > 0;
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<WorkspaceInvite> {
        const nonce = this.helperHashService.sha256Hash(workspaceInviteId);
        try {
            return await tx.workspaceInvite.update({
                where: {
                    id: workspaceInviteId,
                    status: EnumWorkspaceInviteStatus.pending,
                    expiredAt: {
                        gt: acceptedAt,
                    },
                },
                data: {
                    status: EnumWorkspaceInviteStatus.accepted,
                    nonce,
                    acceptedAt,
                    acceptedByUserId: userId,
                    updatedBy: userId,
                },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }
}
