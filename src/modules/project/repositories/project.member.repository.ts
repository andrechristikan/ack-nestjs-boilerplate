import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumProjectMemberRole, Prisma } from '@generated/prisma-client/client';
import type { ProjectMember } from '@generated/prisma-client/client';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type { IProjectMemberRepository } from '@modules/project/interfaces/project.member-repository.interface';
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
    ): Promise<ProjectMember | null> {
        return this.databaseService.client.projectMember.findFirst({
            where: {
                projectId,
                userId,
            },
        });
    }

    async findByIdAndProject(
        projectMemberId: string,
        projectId: string
    ): Promise<ProjectMember | null> {
        return this.databaseService.client.projectMember.findFirst({
            where: {
                id: projectMemberId,
                projectId,
            },
        });
    }

    async findWithPaginationCursor(
        projectId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        return this.paginationService.cursor(
            this.databaseService.client.projectMember,
            {
                ...others,
                where: {
                    ...where,
                    projectId,
                },
                include: {
                    user: {
                        select: UserRefSelect,
                    },
                },
            }
        );
    }

    async create(
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember> {
        return this.databaseService.client.projectMember.create({
            data: {
                projectId,
                userId,
                role,
                createdBy,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember> {
        return tx.projectMember.create({
            data: {
                projectId,
                userId,
                role,
                createdBy,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async updateRole(
        targetMemberId: string,
        expectedRole: EnumProjectMemberRole,
        newRole: EnumProjectMemberRole
    ): Promise<boolean> {
        const { count } =
            await this.databaseService.client.projectMember.updateMany({
                where: { id: targetMemberId, role: expectedRole },
                data: {
                    role: newRole,
                },
            });

        return count > 0;
    }

    async removeMember(
        targetMemberId: string,
        expectedRole: EnumProjectMemberRole
    ): Promise<boolean> {
        const { count } =
            await this.databaseService.client.projectMember.deleteMany({
                where: { id: targetMemberId, role: expectedRole },
            });

        return count > 0;
    }

    async removeById(memberId: string): Promise<boolean> {
        const { count } =
            await this.databaseService.client.projectMember.deleteMany({
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
