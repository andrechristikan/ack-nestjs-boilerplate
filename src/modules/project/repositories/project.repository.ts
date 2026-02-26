import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IProjectCreate,
    IProjectMember,
    IProjectMemberCreate,
    IProjectMemberUpdate,
    IProjectMemberWithUser,
    IProjectMemberWithInvite,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumInviteType,
    EnumProjectMemberStatus,
    EnumProjectStatus,
    Project,
    ProjectMember,
} from '@prisma/client';

@Injectable()
export class ProjectRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

    async findWithPaginationOffsetByTenant(
        tenantId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<Project>> {
        return this.paginationService.offset<Project>(
            this.databaseService.project,
            {
                ...params,
                where: {
                    ...where,
                    tenantId,
                    deletedAt: null,
                },
            }
        );
    }

    async findOneById(projectId: string): Promise<Project | null> {
        return this.databaseService.project.findFirst({
            where: {
                id: projectId,
                deletedAt: null,
            },
        });
    }

    async findOneByIdAndTenant(
        projectId: string,
        tenantId: string
    ): Promise<Project | null> {
        return this.databaseService.project.findFirst({
            where: {
                id: projectId,
                tenantId,
                deletedAt: null,
            },
        });
    }

    async findOneActiveByIdAndTenant(
        projectId: string,
        tenantId: string
    ): Promise<Project | null> {
        return this.databaseService.project.findFirst({
            where: {
                id: projectId,
                tenantId,
                status: EnumProjectStatus.active,
                deletedAt: null,
            },
        });
    }

    async create(data: IProjectCreate): Promise<Project> {
        return this.databaseService.project.create({
            data: {
                ...data,
                deletedAt: null,
            },
        });
    }

    async update(
        projectId: string,
        data: IProjectUpdate
    ): Promise<Project> {
        return this.databaseService.project.update({
            where: { id: projectId },
            data,
        });
    }

    async delete(projectId: string, deletedBy: string): Promise<Project> {
        const deletedAt = this.helperService.dateCreate();

        return this.databaseService.project.update({
            where: { id: projectId, deletedAt: null },
            data: {
                status: EnumProjectStatus.inactive,
                updatedBy: deletedBy,
                deletedAt,
                deletedBy,
            },
        });
    }

    async createMember(data: IProjectMemberCreate): Promise<ProjectMember> {
        return this.databaseService.projectMember.create({
            data: {
                ...data,
                deletedAt: null,
            },
        });
    }

    async findMemberByProjectAndUser(
        projectId: string,
        userId: string,
        status?: EnumProjectMemberStatus
    ): Promise<IProjectMember | null> {
        return this.databaseService.projectMember.findFirst({
            where: {
                projectId,
                userId,
                deletedAt: null,
                project: {
                    deletedAt: null,
                },
                ...(status ? { status } : {}),
            },
            include: {
                role: true,
                project: true,
            },
        });
    }

    async findOneMemberByIdAndProject(
        memberId: string,
        projectId: string
    ): Promise<IProjectMemberWithUser | null> {
        return this.databaseService.projectMember.findFirst({
            where: {
                id: memberId,
                projectId,
                deletedAt: null,
                project: {
                    deletedAt: null,
                },
            },
            include: {
                role: true,
                project: true,
                user: true,
            },
        });
    }

    async updateMember(
        memberId: string,
        data: IProjectMemberUpdate
    ): Promise<ProjectMember> {
        return this.databaseService.projectMember.update({
            where: { id: memberId },
            data,
        });
    }

    async findMembersWithPaginationOffsetByProject(
        projectId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<IProjectMemberWithInvite>> {
        return this.paginationService.offset<IProjectMemberWithInvite>(
            this.databaseService.projectMember,
            {
                ...params,
                where: {
                    ...where,
                    projectId,
                    status:
                        where?.status ?? {
                            in: [
                                EnumProjectMemberStatus.active,
                                EnumProjectMemberStatus.pending,
                            ],
                        },
                    deletedAt: null,
                    project: {
                        deletedAt: null,
                    },
                },
                include: {
                    project: true,
                    role: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            isVerified: true,
                            verifiedAt: true,
                            invites: {
                                where: {
                                    invitationType:
                                        EnumInviteType.projectMember,
                                    contextId: projectId,
                                },
                                orderBy: {
                                    createdAt: 'desc',
                                },
                                take: 1,
                                select: {
                                    id: true,
                                    createdAt: true,
                                    expiresAt: true,
                                    acceptedAt: true,
                                    deletedAt: true,
                                },
                            },
                        },
                    },
                },
            }
        );
    }

    async findMembersWithPaginationOffsetByUser(
        userId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<IProjectMember>> {
        return this.paginationService.offset<IProjectMember>(
            this.databaseService.projectMember,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                    status: EnumProjectMemberStatus.active,
                    deletedAt: null,
                    project: {
                        status: EnumProjectStatus.active,
                        deletedAt: null,
                    },
                },
                include: {
                    project: true,
                    role: true,
                },
            }
        );
    }

}
