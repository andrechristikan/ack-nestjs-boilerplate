import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IProjectMember,
    IProjectShare,
} from '@modules/project/interfaces/project.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumProjectMemberStatus,
    EnumProjectShareAccess,
    EnumProjectStatus,
    Prisma,
    Project,
    ProjectMember,
    ProjectShare,
} from '@prisma/client';

@Injectable()
export class ProjectRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
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
                },
            }
        );
    }

    async findOneByIdAndTenant(
        projectId: string,
        tenantId: string
    ): Promise<Project | null> {
        return this.databaseService.project.findFirst({
            where: {
                id: projectId,
                tenantId,
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
            },
        });
    }

    async create(data: Prisma.ProjectUncheckedCreateInput): Promise<Project> {
        return this.databaseService.project.create({ data });
    }

    async update(
        projectId: string,
        data: Prisma.ProjectUncheckedUpdateInput
    ): Promise<Project> {
        return this.databaseService.project.update({
            where: { id: projectId },
            data,
        });
    }

    async addMember(
        data: Prisma.ProjectMemberUncheckedCreateInput
    ): Promise<ProjectMember> {
        return this.databaseService.projectMember.create({ data });
    }

    async findMemberByProjectAndUser(
        projectId: string,
        userId: string,
        status: EnumProjectMemberStatus = EnumProjectMemberStatus.active
    ): Promise<IProjectMember | null> {
        return this.databaseService.projectMember.findFirst({
            where: {
                projectId,
                userId,
                status,
            },
            include: {
                role: true,
                project: true,
            },
        });
    }

    async addShare(
        data: Prisma.ProjectShareUncheckedCreateInput
    ): Promise<ProjectShare> {
        return this.databaseService.projectShare.create({ data });
    }

    async findShareByProjectAndUser(
        projectId: string,
        userId: string,
        access: EnumProjectShareAccess = EnumProjectShareAccess.read
    ): Promise<IProjectShare | null> {
        return this.databaseService.projectShare.findFirst({
            where: {
                projectId,
                userId,
                access,
            },
            include: {
                project: true,
            },
        });
    }

    async findSharesWithPaginationOffset(
        projectId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<IProjectShare>> {
        return this.paginationService.offset<IProjectShare>(
            this.databaseService.projectShare,
            {
                ...params,
                where: {
                    ...where,
                    projectId,
                },
                include: {
                    project: true,
                },
            }
        );
    }

    async findSharesWithPaginationOffsetByUser(
        userId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<IProjectShare>> {
        return this.paginationService.offset<IProjectShare>(
            this.databaseService.projectShare,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                    project: {
                        status: EnumProjectStatus.active,
                    },
                },
                include: {
                    project: true,
                },
            }
        );
    }

    async findMembershipsWithPaginationCursorByUser(
        userId: string,
        { where, ...params }: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<IProjectMember>> {
        return this.paginationService.cursor<IProjectMember>(
            this.databaseService.projectMember,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                    status: EnumProjectMemberStatus.active,
                },
                include: {
                    role: true,
                    project: true,
                },
            }
        );
    }
}
