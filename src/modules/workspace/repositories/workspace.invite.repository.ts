import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import {
    EnumWorkspaceInviteStatus,
    Prisma,
    WorkspaceInvite,
} from '@generated/prisma-client';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import { IWorkspaceInviteRepository } from '@modules/workspace/interfaces/workspace.invite.repository.interface';
import { IWorkspaceInviteCreateData } from '@modules/workspace/interfaces/workspace.interface';
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
        workspaceId: string,
        actorId: string
    ): Promise<void> {
        await tx.workspaceInvite.updateMany({
            where: {
                workspaceId,
                status: EnumWorkspaceInviteStatus.pending,
            },
            data: {
                status: EnumWorkspaceInviteStatus.expired,
                updatedBy: actorId,
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
    ): Promise<IPaginationCursorReturn<WorkspaceInvite>> {
        return this.paginationService.cursor<
            WorkspaceInvite,
            Prisma.WorkspaceInviteWhereInput
        >(this.databaseService.client.workspaceInvite, {
            ...others,
            where: {
                ...where,
                ...(status ?? {}),
                workspaceId,
            },
        });
    }

    async createPendingInTx(
        tx: IDatabaseTransactionClient,
        {
            workspaceId,
            email,
            workspaceRole,
            projectId,
            projectRole,
            hashedToken,
            reference,
            expiredAt,
            invitedByUserId,
        }: IWorkspaceInviteCreateData
    ): Promise<WorkspaceInvite> {
        return tx.workspaceInvite.create({
            data: {
                workspaceId,
                email,
                workspaceRole,
                projectId,
                projectRole,
                token: hashedToken,
                reference,
                expiredAt,
                invitedByUserId,
                createdBy: invitedByUserId,
            },
        });
    }

    async rotateForResend(
        workspaceInviteId: string,
        actorId: string,
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
                updatedBy: actorId,
            },
        });
    }

    async revokeInTx(
        tx: IDatabaseTransactionClient,
        workspaceInviteId: string,
        actorId: string
    ): Promise<void> {
        await tx.workspaceInvite.update({
            where: { id: workspaceInviteId },
            data: {
                status: EnumWorkspaceInviteStatus.revoked,
                updatedBy: actorId,
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
