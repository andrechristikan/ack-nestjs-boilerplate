import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    EnumProjectMemberRole,
    EnumProjectMemberStatus,
    EnumTenantMemberRole,
    Prisma,
} from '@generated/prisma-client';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { IProject, IProjectMember } from '@modules/project/interfaces/project.interface';
import {
    IRequestAppWithProject,
    IRequestAppWithProjectTenant,
} from '@modules/project/interfaces/request.project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { HelperService } from '@common/helper/services/helper.service';
import {
    ForbiddenException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';

@Injectable()
export class ProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly projectUtil: ProjectUtil,
        private readonly helperService: HelperService
    ) {}

    // Tenant permissions authorize tenant-wide actions,
    // while project-resource actions are validated by project member permissions.

    async validateProjectGuard(
        request: IRequestAppWithProjectTenant
    ): Promise<IProject> {
        const projectId = request.params?.['projectId'];
        const project = await this.projectRepository.findOneByIdAndTenant(
            projectId,
            request.__tenant!.id
        );

        if (!project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.error.notFound',
            });
        }

        return project;
    }

    async validateProjectMemberGuard(
        request: IRequestAppWithProjectTenant
    ): Promise<IProjectMember | null> {
        const { user } = request;
        if (!user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const projectId = request.__project!.id;
        const tenantMemberRole = request.__tenantMember?.role;

        if (
            tenantMemberRole === EnumTenantMemberRole.owner ||
            tenantMemberRole === EnumTenantMemberRole.admin
        ) {
            return null;
        }

        const projectMember =
            await this.projectRepository.findMemberByProjectAndUser(
                projectId,
                user.userId,
                EnumProjectMemberStatus.active
            );

        if (!projectMember) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        return projectMember;
    }

    async create(
        tenantId: string,
        dto: ProjectCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        try {
            const name = dto.name.trim();
            const description = dto.description.trim();
            const slug = await this.createUniqueSlug(name);

            const project = await this.projectRepository.create(
                {
                    tenantId,
                    name,
                    description,
                    slug,
                    createdBy,
                    updatedBy: createdBy,
                },
                [
                    {
                        userId: createdBy,
                        role: EnumProjectMemberRole.admin,
                        status: EnumProjectMemberStatus.active,
                        createdBy,
                        updatedBy: createdBy,
                    },
                ]
            );

            return {
                data: {
                    id: project.id,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async getListByTenant(
        tenantId: string,
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectSelect,
            Prisma.ProjectWhereInput
        >
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        const { data, ...others } = await this.projectRepository.findWithPaginationOffsetByTenantAndUser(
                      tenantId,
                      userId,
                      pagination
                  );

        return {
            ...others,
            data: data.map(project => this.projectUtil.mapProject(project)),
        };
    }

    async getOne(
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const project = await this.projectRepository.findOneById(projectId);
        if (!project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.error.notFound',
            });
        }

        return {
            data: this.projectUtil.mapProject(project),
        };
    }

    async update(
        projectId: string,
        dto: ProjectUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const data: {
            name?: string;
            description?: string;
            updatedBy: string;
        } = { updatedBy };

        if (dto.name !== undefined) {
            data.name = dto.name.trim();
        }

        if (dto.description !== undefined) {
            data.description = dto.description.trim();
        }

        if (dto.name === undefined && dto.description === undefined) {
            return {};
        }

        await this.projectRepository.update(projectId, data);

        return {};
    }

    async updateSlug(
        projectId: string,
        dto: ProjectUpdateSlugRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const project = await this.projectRepository.findOneById(projectId);
        if (!project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.error.notFound',
            });
        }
        if (!project.tenantId) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        const slug = await this.createUniqueSlug(
            dto.slug,
            project.id
        );
        await this.projectRepository.update(projectId, {
            slug,
            updatedBy,
        });

        return {};
    }

    async delete(
        projectId: string,
        deletedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.projectRepository.delete(projectId, deletedBy);

        return {};
    }

    private resolveProjectIdFromRequest(
        request: IRequestAppWithProject
    ): string {
        const key = 'projectId';
        const value = request.params?.[key];
        const projectId = typeof value === 'string' ? value : undefined;

        request.__projectId = projectId;
        return projectId;
    }

    private createSlug(value: string): string {
        const normalized = value
            .trim()
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^\w\s-]/g, '')
            .replace(/_/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');

        return normalized || 'project';
    }

    private async createUniqueSlug(
        value: string,
        excludeProjectId?: string
    ): Promise<string> {
        const baseSlug = this.createSlug(value);
        let slug = baseSlug;

        for (let attempt = 0; attempt < 10; attempt++) {
            const existing =
                await this.projectRepository.findOneBySlug(
                    slug
                );
            if (!existing || existing.id === excludeProjectId) {
                return slug;
            }

            slug = `${baseSlug}-${this.helperService.randomString(6).toLowerCase()}`;
        }

        return `${baseSlug}-${this.helperService.randomString(10).toLowerCase()}`;
    }
}
