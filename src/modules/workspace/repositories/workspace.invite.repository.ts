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
        private readonly helperHashService: HelperHashService,
        private readonly paginationService: PaginationService,
        private readonly configService: ConfigService
    ) {
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

    async expireStalePending(): Promise<number> {
        const today = this.helperDateService.create();

        let total = 0;
        let fetched: number;
        do {
            // Sequential by design: fan-out over an unbounded collection runs in bounded chunks
            const stale =
                await this.databaseService.client.workspaceInvite.findMany({
                    where: {
                        status: EnumWorkspaceInviteStatus.pending,
                        expiredAt: {
                            lte: today,
                        },
                    },
                    select: { id: true },
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

    async revokePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        const now = this.helperDateService.create();
        const pending = await tx.workspaceInvite.findMany({
            where: {
                workspaceId,
                status: EnumWorkspaceInviteStatus.pending,
            },
            select: { id: true, expiredAt: true },
        });

        for (const { id, expiredAt } of pending) {
            const nonce = this.helperHashService.sha256Hash(id);
            await tx.workspaceInvite.updateMany({
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
                },
            });
        }
    }

    async revokePendingByEmailInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        email: string
    ): Promise<void> {
        const now = this.helperDateService.create();
        const pending = await tx.workspaceInvite.findFirst({
            where: {
                workspaceId,
                email,
                status: EnumWorkspaceInviteStatus.pending,
            },
            select: { id: true, expiredAt: true },
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
        email: string
    ): Promise<void> {
        const now = this.helperDateService.create();
        const pending = await tx.workspaceInvite.findMany({
            where: {
                email,
                status: EnumWorkspaceInviteStatus.pending,
            },
            select: { id: true, expiredAt: true },
        });

        for (const { id, expiredAt } of pending) {
            const nonce = this.helperHashService.sha256Hash(id);
            await tx.workspaceInvite.updateMany({
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
        nonce,
    }: IWorkspaceInviteCreateData): Promise<WorkspaceInvite> {
        const now = this.helperDateService.create();

        return this.databaseService.withTransaction(async tx => {
            const stale = await tx.workspaceInvite.findFirst({
                where: {
                    nonce,
                    status: EnumWorkspaceInviteStatus.pending,
                    expiredAt: { lte: now },
                },
                select: { id: true },
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

            return tx.workspaceInvite.create({
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
            });
        });
    }

    async rotateForResend(
        workspaceInviteId: string,
        hashedToken: string,
        reference: string,
        expiredAt: Date,
        resentAt: Date
    ): Promise<WorkspaceInvite | null> {
        return this.databaseService.withTransaction(async tx => {
            const { count } = await tx.workspaceInvite.updateMany({
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
        const nonce = this.helperHashService.sha256Hash(workspaceInviteId);
        const { count } =
            await this.databaseService.client.workspaceInvite.updateMany({
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
    }

    async acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<boolean> {
        const nonce = this.helperHashService.sha256Hash(workspaceInviteId);
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
                nonce,
                acceptedAt,
                acceptedByUserId: userId,
                updatedBy: userId,
            },
        });

        return count > 0;
    }
}
