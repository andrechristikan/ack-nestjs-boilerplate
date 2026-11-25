import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import type { ProjectMember } from '@generated/prisma-client/client';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberWithUserInclude } from '@modules/project/constants/project.constant';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import type { IProjectMemberRepository } from '@modules/project/interfaces/project.member-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberRepository implements IProjectMemberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

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
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        return this.paginationService.cursor(
            this.databaseService.client.projectMember,
            {
                ...others,
                where: {
                    ...where,
                    projectId,
                },
                include: ProjectMemberWithUserInclude,
            }
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<void> {
        try {
            await tx.projectMember.create({
                data: {
                    projectId,
                    userId,
                    role,
                    createdBy,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toUniqueException(
                error,
                [
                    {
                        field: 'userId',
                        exception: new ProjectMemberAlreadyAssignedException(),
                    },
                ],
                new ProjectMemberAlreadyAssignedException()
            );
        }
    }

    async createWithUserInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember> {
        try {
            return await tx.projectMember.create({
                data: {
                    projectId,
                    userId,
                    role,
                    createdBy,
                },
                include: ProjectMemberWithUserInclude,
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toUniqueException(
                error,
                [
                    {
                        field: 'userId',
                        exception: new ProjectMemberAlreadyAssignedException(),
                    },
                ],
                new AppUnknownException(error)
            );
        }
    }

    async updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRole: EnumProjectMemberRole,
        newRole: EnumProjectMemberRole
    ): Promise<ProjectMember> {
        try {
            return await tx.projectMember.update({
                where: { id: targetMemberId, role: expectedRole },
                data: {
                    role: newRole,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new ProjectMemberPeerForbiddenException()
            );
        }
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        expectedRole: EnumProjectMemberRole
    ): Promise<ProjectMember> {
        try {
            return await tx.projectMember.delete({
                where: { id: targetMemberId, role: expectedRole },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new ProjectMemberPeerForbiddenException()
            );
        }
    }

    async removeByIdInTx(
        tx: IDatabaseTransactionClient,
        memberId: string
    ): Promise<ProjectMember> {
        try {
            return await tx.projectMember.delete({
                where: { id: memberId },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new ProjectMemberNotFoundException()
            );
        }
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
