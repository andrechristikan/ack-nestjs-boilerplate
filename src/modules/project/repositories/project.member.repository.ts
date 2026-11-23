import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleScope } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import type {
    IProjectMember,
    IProjectMemberWithRole,
} from '@modules/project/interfaces/project.interface';
import { RoleRefSelect } from '@modules/role/constants/role.constant';
import type { EnumRoleProjectKey } from '@modules/role/enums/role.enum';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type { IProjectMemberRepository } from '@modules/project/interfaces/project.member-repository.interface';
import { ProjectMemberRoleInclude } from '@modules/project/constants/project.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberRepository implements IProjectMemberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findOneByProjectAndUser(
        projectId: string,
        userId: string
    ): Promise<IProjectMemberWithRole | null> {
        return this.databaseService.client.projectMember.findFirst({
            where: {
                projectId,
                userId,
            },
            include: ProjectMemberRoleInclude,
        });
    }

    async findByIdAndProject(
        projectMemberId: string,
        projectId: string,
        additionalWhere: Prisma.ProjectMemberWhereInput | null
    ): Promise<IProjectMemberWithRole | null> {
        return this.databaseService.client.projectMember.findFirst({
            where: {
                AND: [additionalWhere ?? {}],
                id: projectMemberId,
                projectId,
            },
            include: ProjectMemberRoleInclude,
        });
    }

    async findWithPaginationCursor(
        projectId: string,
        { where, ...others }: IPaginationQueryCursorParams,
        additionalWhere: Prisma.ProjectMemberWhereInput | null
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        return this.paginationService.cursor(
            this.databaseService.client.projectMember,
            {
                ...others,
                where: {
                    AND: [additionalWhere ?? {}, where ?? {}, { projectId }],
                },
                include: {
                    user: {
                        select: UserRefSelect,
                    },
                    role: { select: RoleRefSelect },
                },
            }
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<IProjectMember> {
        return tx.projectMember.create({
            data: {
                projectId,
                userId,
                roleId,
                createdBy,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
                role: { select: RoleRefSelect },
            },
        });
    }

    async updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRoleId: string,
        newRoleId: string
    ): Promise<boolean> {
        const { count } = await tx.projectMember.updateMany({
            where: { id: targetMemberId, roleId: expectedRoleId },
            data: {
                roleId: newRoleId,
            },
        });

        return count > 0;
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRoleId: string
    ): Promise<boolean> {
        const { count } = await tx.projectMember.deleteMany({
            where: { id: targetMemberId, roleId: expectedRoleId },
        });

        return count > 0;
    }

    async countByProjectAndRoleKey(
        projectId: string,
        key: EnumRoleProjectKey
    ): Promise<number> {
        return this.databaseService.client.projectMember.count({
            where: {
                projectId,
                role: { scope: EnumRoleScope.project, key },
            },
        });
    }

    async removeByIdInTx(
        tx: IDatabaseTransactionClient,
        memberId: string
    ): Promise<boolean> {
        const { count } = await tx.projectMember.deleteMany({
            where: { id: memberId },
        });

        return count > 0;
    }

    async removeByWorkspaceAndUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number> {
        const { count } = await tx.projectMember.deleteMany({
            where: { userId, project: { workspaceId } },
        });

        return count;
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        const { count } = await tx.projectMember.deleteMany({
            where: { userId },
        });

        return count;
    }
}
