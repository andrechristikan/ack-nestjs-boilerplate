import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
    WorkspaceMember,
} from '@generated/prisma-client';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { IWorkspaceMemberRepository } from '@modules/workspace/interfaces/workspace.member.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberRepository implements IWorkspaceMemberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    private buildWorkspaceScopedWhere(
        workspaceId: string,
        where?: Prisma.WorkspaceMemberWhereInput,
        role?: Record<string, IPaginationIn>
    ): Prisma.WorkspaceMemberWhereInput {
        return {
            ...where,
            ...(role ?? {}),
            workspaceId,
        };
    }

    async findOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId,
            },
        });
    }

    async findByIdAndWorkspace(
        workspaceMemberId: string,
        workspaceId: string
    ): Promise<WorkspaceMember | null> {
        return this.databaseService.client.workspaceMember.findFirst({
            where: {
                id: workspaceMemberId,
                workspaceId,
            },
        });
    }

    async countOwnedActiveByUser(userId: string): Promise<number> {
        return this.databaseService.client.workspaceMember.count({
            where: {
                userId,
                role: EnumWorkspaceMemberRole.owner,
                workspace: {
                    OR: WorkspaceActiveFilter,
                },
            },
        });
    }

    async countOwners(workspaceId: string): Promise<number> {
        return this.databaseService.client.workspaceMember.count({
            where: {
                workspaceId,
                role: EnumWorkspaceMemberRole.owner,
            },
        });
    }

    async findReviewersByWorkspace(
        workspaceId: string
    ): Promise<{ userId: string }[]> {
        return this.databaseService.client.workspaceMember.findMany({
            where: {
                workspaceId,
                role: {
                    in: [
                        EnumWorkspaceMemberRole.owner,
                        EnumWorkspaceMemberRole.admin,
                    ],
                },
            },
            select: { userId: true },
        });
    }

    async findWithPaginationOffset(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>> {
        return this.paginationService.offset<
            IWorkspaceMember,
            Prisma.WorkspaceMemberWhereInput
        >(this.databaseService.client.workspaceMember, {
            ...others,
            where: this.buildWorkspaceScopedWhere(workspaceId, where, role),
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>> {
        return this.paginationService.cursor<
            IWorkspaceMember,
            Prisma.WorkspaceMemberWhereInput
        >(this.databaseService.client.workspaceMember, {
            ...others,
            where: this.buildWorkspaceScopedWhere(workspaceId, where, role),
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async createOwnerInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember> {
        return tx.workspaceMember.create({
            data: {
                workspaceId,
                userId,
                role: EnumWorkspaceMemberRole.owner,
                createdBy: userId,
            },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        role: EnumWorkspaceMemberRole,
        createdBy: string
    ): Promise<WorkspaceMember> {
        return tx.workspaceMember.create({
            data: {
                workspaceId,
                userId,
                role,
                createdBy,
            },
        });
    }

    async updateRoleInTx(
        tx: IDatabaseTransactionClient,
        actorId: string,
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void> {
        await tx.workspaceMember.update({
            where: { id: targetMemberId },
            data: {
                role: newRole,
                updatedBy: actorId,
            },
        });
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string
    ): Promise<void> {
        await tx.workspaceMember.delete({
            where: { id: targetMemberId },
        });
    }

    async transferOwnershipInTx(
        tx: IDatabaseTransactionClient,
        fromMemberId: string,
        toMemberId: string,
        actorId: string
    ): Promise<void> {
        await tx.workspaceMember.update({
            where: { id: fromMemberId },
            data: {
                role: EnumWorkspaceMemberRole.admin,
                updatedBy: actorId,
            },
        });
        await tx.workspaceMember.update({
            where: { id: toMemberId },
            data: {
                role: EnumWorkspaceMemberRole.owner,
                updatedBy: actorId,
            },
        });
    }
}
