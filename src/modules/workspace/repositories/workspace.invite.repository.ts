import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
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

@Injectable()
export class WorkspaceInviteRepository implements IWorkspaceInviteRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly paginationService: PaginationService
    ) {}

    /** Flips truly-expired `pending` invites to `expired`; returns the count updated. */
    async expireStalePending(): Promise<number> {
        const today = this.helperDateService.create();

        const { count } =
            await this.databaseService.client.workspaceInvite.updateMany({
                where: {
                    status: EnumWorkspaceInviteStatus.pending,
                    expiredAt: {
                        lt: today,
                    },
                },
                data: {
                    status: EnumWorkspaceInviteStatus.expired,
                },
            });

        return count;
    }

    async expirePendingByWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<void> {
        await tx.workspaceInvite.updateMany({
            where: {
                workspaceId,
                status: EnumWorkspaceInviteStatus.pending,
            },
            data: {
                status: EnumWorkspaceInviteStatus.expired,
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
                workspace: WorkspaceActiveFilter,
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

    async existsPendingByWorkspaceAndEmail(
        workspaceId: string,
        email: string
    ): Promise<boolean> {
        const count = await this.databaseService.client.workspaceInvite.count({
            where: {
                workspaceId,
                email,
                status: EnumWorkspaceInviteStatus.pending,
            },
        });

        return count > 0;
    }

    async findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceInviteWhereInput>,
        status?: Record<string, IPaginationIn>
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
            },
        });
    }

    async rotateForResend(
        workspaceInviteId: string,
        hashedToken: string,
        reference: string,
        expiredAt: Date
    ): Promise<WorkspaceInvite> {
        return this.databaseService.client.workspaceInvite.update({
            where: { id: workspaceInviteId },
            data: {
                token: hashedToken,
                reference,
                expiredAt,
            },
        });
    }

    async revoke(workspaceInviteId: string): Promise<void> {
        await this.databaseService.client.workspaceInvite.update({
            where: { id: workspaceInviteId },
            data: {
                status: EnumWorkspaceInviteStatus.revoked,
            },
        });
    }

    async acceptInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        userId: string,
        acceptedAt: Date
    ): Promise<void> {
        await tx.workspaceInvite.update({
            where: { id: workspaceInviteId },
            data: {
                status: EnumWorkspaceInviteStatus.accepted,
                acceptedAt,
                acceptedByUserId: userId,
                updatedBy: userId,
            },
        });
    }
}
