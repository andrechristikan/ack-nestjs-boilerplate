import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationCursorReturn,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';
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
        where: Prisma.WorkspaceMemberWhereInput | null,
        role: Record<string, IPaginationIn> | null
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

    async countOwnersInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string
    ): Promise<number> {
        return tx.workspaceMember.count({
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
        role: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            where ?? null,
            role
        );

        return this.paginationService.offset(
            this.databaseService.client.workspaceMember,
            {
                ...others,
                where: scopedWhere,
                include: {
                    user: {
                        select: UserRefSelect,
                    },
                },
            }
        );
    }

    async findWithPaginationCursor(
        workspaceId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role: Record<string, IPaginationIn> | null
    ): Promise<IPaginationCursorReturn<IWorkspaceMember>> {
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            where ?? null,
            role
        );

        return this.paginationService.cursor(
            this.databaseService.client.workspaceMember,
            {
                ...others,
                where: scopedWhere,
                include: {
                    user: {
                        select: UserRefSelect,
                    },
                },
            }
        );
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
        expectedRole: EnumWorkspaceMemberRole,
        newRole: EnumWorkspaceMemberRole
    ): Promise<boolean> {
        const { count } =
            await this.databaseService.client.workspaceMember.updateMany({
                where: { id: targetMemberId, role: expectedRole },
                data: {
                    role: newRole,
                },
            });

        return count > 0;
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRole: EnumWorkspaceMemberRole
    ): Promise<boolean> {
        const { count } = await tx.workspaceMember.deleteMany({
            where: { id: targetMemberId, role: expectedRole },
        });

        return count > 0;
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        const { count } = await tx.workspaceMember.deleteMany({
            where: { userId },
        });

        return count;
    }

    async transferOwnership(
        workspaceId: string,
        fromMemberId: string,
        toMemberId: string
    ): Promise<boolean> {
        return this.databaseService.withTransaction(async tx => {
            const { count: promoted } = await tx.workspaceMember.updateMany({
                where: {
                    id: toMemberId,
                    workspaceId,
                    role: { not: EnumWorkspaceMemberRole.owner },
                    workspace: {
                        members: {
                            some: {
                                id: fromMemberId,
                                role: EnumWorkspaceMemberRole.owner,
                            },
                        },
                    },
                },
                data: {
                    role: EnumWorkspaceMemberRole.owner,
                },
            });
            if (promoted === 0) {
                return false;
            }

            const { count: demoted } = await tx.workspaceMember.updateMany({
                where: {
                    id: fromMemberId,
                    workspaceId,
                    role: EnumWorkspaceMemberRole.owner,
                },
                data: {
                    role: EnumWorkspaceMemberRole.admin,
                },
            });

            return demoted > 0;
        });
    }
}
