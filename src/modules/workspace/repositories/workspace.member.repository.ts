import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import type { IWorkspaceMemberRepository } from '@modules/workspace/interfaces/workspace.member-repository.interface';
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
                workspace: WorkspaceActiveFilter,
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
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            where,
            role
        );

        return this.paginationService.offset<
            IWorkspaceMember,
            Prisma.WorkspaceMemberWhereInput
        >(this.databaseService.client.workspaceMember, {
            ...others,
            where: scopedWhere,
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
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            where,
            role
        );

        return this.paginationService.cursor<
            IWorkspaceMember,
            Prisma.WorkspaceMemberWhereInput
        >(this.databaseService.client.workspaceMember, {
            ...others,
            where: scopedWhere,
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
                updatedBy: userId,
            },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        role: EnumWorkspaceMemberRole,
        actorId: string
    ): Promise<WorkspaceMember> {
        return tx.workspaceMember.create({
            data: {
                workspaceId,
                userId,
                role,
                createdBy: actorId,
                updatedBy: actorId,
            },
        });
    }

    async updateRole(
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void> {
        await this.databaseService.client.workspaceMember.update({
            where: { id: targetMemberId },
            data: {
                role: newRole,
            },
        });
    }

    async removeMember(targetMemberId: string): Promise<void> {
        await this.databaseService.client.workspaceMember.delete({
            where: { id: targetMemberId },
        });
    }

    async transferOwnership(
        fromMemberId: string,
        toMemberId: string
    ): Promise<void> {
        await this.databaseService.withTransaction(async tx => {
            await tx.workspaceMember.update({
                where: { id: fromMemberId },
                data: {
                    role: EnumWorkspaceMemberRole.admin,
                },
            });
            await tx.workspaceMember.update({
                where: { id: toMemberId },
                data: {
                    role: EnumWorkspaceMemberRole.owner,
                },
            });
        });
    }
}
