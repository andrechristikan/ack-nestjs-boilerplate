import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import {
    EnumWorkspaceInviteStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import {
    WorkspaceActiveFilter,
    WorkspaceInviteUserListSelect,
} from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceInviteRepository } from '@modules/workspace/interfaces/workspace.invite-repository.interface';
import type {
    IWorkspaceInviteCreateData,
    IWorkspaceInviteList,
} from '@modules/workspace/interfaces/workspace.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceInviteRepository implements IWorkspaceInviteRepository {
    private readonly expireChunkSize: number;

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly helperArrayService: HelperArrayService,
        private readonly paginationService: PaginationService,
        private readonly configService: ConfigService
    ) {
        this.expireChunkSize = this.configService.get<number>(
            'workspace.invite.expireChunkSize'
        )!;
    }

    /** Flips truly-expired `pending` invites to `expired`, each row's `pendingKey` becoming its own id; returns the count updated. */
    async expireStalePending(): Promise<number> {
        const today = this.helperDateService.create();

        const stale =
            await this.databaseService.client.workspaceInvite.findMany({
                where: {
                    status: EnumWorkspaceInviteStatus.pending,
                    expiredAt: {
                        lt: today,
                    },
                },
                select: { id: true },
            });
        const chunks = this.helperArrayService.chunk(
            stale,
            this.expireChunkSize
        );

        let total = 0;
        for (const chunk of chunks) {
            // Sequential by design: fan-out over an unbounded collection runs in bounded chunks
            const results = await Promise.all(
                chunk.map(({ id }) =>
                    this.databaseService.client.workspaceInvite.updateMany({
                        where: {
                            id,
                            status: EnumWorkspaceInviteStatus.pending,
                        },
                        data: {
                            status: EnumWorkspaceInviteStatus.expired,
                            pendingKey: id,
                        },
                    })
                )
            );
            total += results.reduce((sum, { count }) => sum + count, 0);
        }

        return total;
    }

    async revokePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        const pending = await tx.workspaceInvite.findMany({
            where: {
                workspaceId,
                status: EnumWorkspaceInviteStatus.pending,
            },
            select: { id: true },
        });

        for (const { id } of pending) {
            await tx.workspaceInvite.updateMany({
                where: {
                    id,
                    status: EnumWorkspaceInviteStatus.pending,
                },
                data: {
                    status: EnumWorkspaceInviteStatus.revoked,
                    pendingKey: id,
                },
            });
        }
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
    ): Promise<WorkspaceInvite | null> {
        const today = this.helperDateService.create();

        return this.databaseService.client.workspaceInvite.findFirst({
            where: {
                token: hashedToken,
                status: EnumWorkspaceInviteStatus.pending,
                expiredAt: {
                    gt: today,
                },
                workspace: {
                    OR: WorkspaceActiveFilter,
                },
            },
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
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<IWorkspaceInviteList>> {
        return this.paginationService.cursor<
            IWorkspaceInviteList,
            Prisma.WorkspaceInviteWhereInput
        >(this.databaseService.client.workspaceInvite, {
            ...others,
            where: {
                ...where,
                ...(status ?? {}),
                workspaceId,
            },
            select: WorkspaceInviteUserListSelect,
        });
    }

    async createPending({
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
        pendingKey,
    }: IWorkspaceInviteCreateData): Promise<WorkspaceInvite> {
        return this.databaseService.client.workspaceInvite.create({
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
                pendingKey,
            },
        });
    }

    async rotateForResend(
        workspaceInviteId: string,
        hashedToken: string,
        reference: string,
        expiredAt: Date
    ): Promise<WorkspaceInvite | null> {
        return this.databaseService.withTransaction(async tx => {
            const { count } = await tx.workspaceInvite.updateMany({
                where: {
                    id: workspaceInviteId,
                    status: EnumWorkspaceInviteStatus.pending,
                },
                data: {
                    token: hashedToken,
                    reference,
                    expiredAt,
                },
            });
            if (count === 0) {
                return null;
            }

            return tx.workspaceInvite.findUnique({
                where: { id: workspaceInviteId },
            });
        });
    }

    async revoke(workspaceInviteId: string): Promise<boolean> {
        const { count } =
            await this.databaseService.client.workspaceInvite.updateMany({
                where: {
                    id: workspaceInviteId,
                    status: EnumWorkspaceInviteStatus.pending,
                },
                data: {
                    status: EnumWorkspaceInviteStatus.revoked,
                    pendingKey: workspaceInviteId,
                },
            });

        return count > 0;
    }

    async acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<boolean> {
        const { count } = await tx.workspaceInvite.updateMany({
            where: {
                id: workspaceInviteId,
                status: EnumWorkspaceInviteStatus.pending,
                expiredAt: {
                    gt: acceptedAt,
                },
            },
            data: {
                status: EnumWorkspaceInviteStatus.accepted,
                pendingKey: workspaceInviteId,
                acceptedAt,
                acceptedByUserId: userId,
                updatedBy: userId,
            },
        });

        return count > 0;
    }
}
