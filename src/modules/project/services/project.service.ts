import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectShareRequestDto } from '@modules/project/dtos/request/project.share.request.dto';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { ProjectShareResponseDto } from '@modules/project/dtos/response/project.share.response.dto';
import { EnumProjectAccessType } from '@modules/project/enums/project.access-type.enum';
import { ProjectRoleNameAdmin } from '@modules/project/constants/project.constant';
import {
    IProject,
    IProjectShare,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumProjectMemberStatus,
    EnumProjectShareAccess,
    EnumProjectStatus,
    EnumRoleScope,
    EnumTenantStatus,
    Project,
} from '@prisma/client';

@Injectable()
export class ProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly roleRepository: RoleRepository,
        private readonly userRepository: UserRepository,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    // Project role validation is handled via tenant permissions for this module.

    async create(
        tenantId: string,
        dto: ProjectCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        await this.assertTenantExistsAndActive(tenantId);

        const project = await this.projectRepository.create({
            tenantId,
            name: dto.name.trim(),
            status: EnumProjectStatus.active,
            createdBy,
            updatedBy: createdBy,
        });

        const role = await this.resolveProjectRoleByName(ProjectRoleNameAdmin);
        await this.projectRepository.addMember({
            projectId: project.id,
            userId: createdBy,
            roleId: role.id,
            status: EnumProjectMemberStatus.active,
            createdBy,
            updatedBy: createdBy,
        });

        return {
            data: {
                id: project.id,
            },
        };
    }

    async getListByTenant(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        await this.assertTenantExists(tenantId);

        const { data, ...others } =
            await this.projectRepository.findWithPaginationOffsetByTenant(
                tenantId,
                pagination
            );

        return {
            ...others,
            data: data.map(project => this.mapProject(project)),
        };
    }

    async getOneByTenant(
        tenantId: string,
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const project = await this.assertProjectExists(tenantId, projectId);

        return {
            data: this.mapProject(project),
        };
    }

    async updateByTenant(
        tenantId: string,
        projectId: string,
        dto: ProjectUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.assertProjectExists(tenantId, projectId);

        const data: {
            name?: string;
            status?: EnumProjectStatus;
            updatedBy: string;
        } = { updatedBy };

        if (dto.name !== undefined) {
            data.name = dto.name.trim();
        }

        if (dto.status !== undefined) {
            data.status = dto.status;
        }

        if (dto.name === undefined && dto.status === undefined) {
            return {};
        }

        await this.projectRepository.update(projectId, data);

        return {};
    }

    async deleteByTenant(
        tenantId: string,
        projectId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.assertProjectExists(tenantId, projectId);

        await this.projectRepository.update(projectId, {
            status: EnumProjectStatus.inactive,
            updatedBy,
        });

        return {};
    }

    async shareProject(
        tenantId: string,
        projectId: string,
        dto: ProjectShareRequestDto,
        sharedBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        await this.assertProjectExists(tenantId, projectId);

        if (!this.databaseUtil.checkIdIsValid(dto.userId)) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'projectShare.error.userIdInvalid',
            });
        }

        const [user, share] = await Promise.all([
            this.userRepository.findOneById(dto.userId),
            this.projectRepository.findShareByProjectAndUser(
                projectId,
                dto.userId
            ),
        ]);

        if (!user) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'projectShare.error.userNotFound',
            });
        }

        if (share) {
            throw new ConflictException({
                statusCode: 409,
                message: 'projectShare.error.exist',
            });
        }

        const projectShare = await this.projectRepository.addShare({
            projectId,
            userId: dto.userId,
            access: EnumProjectShareAccess.read,
            createdBy: sharedBy,
            updatedBy: sharedBy,
        });

        return {
            data: {
                id: projectShare.id,
            },
        };
    }

    async listProjectShares(
        tenantId: string,
        projectId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectShareResponseDto>> {
        await this.assertProjectExists(tenantId, projectId);

        const { data, ...others } =
            await this.projectRepository.findSharesWithPaginationOffset(
                projectId,
                pagination
            );

        return {
            ...others,
            data: data.map(share => this.mapShare(share)),
        };
    }

    async listSharedProjects(
        userId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectAccessResponseDto>> {
        const { data, ...others } =
            await this.projectRepository.findSharesWithPaginationOffsetByUser(
                userId,
                pagination
            );

        return {
            ...others,
            data: data.map(share => ({
                accessType: EnumProjectAccessType.shared,
                project: this.mapProject(share.project as Project),
            })),
        };
    }

    async getSharedProjectById(
        projectId: string,
        userId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        if (!this.databaseUtil.checkIdIsValid(projectId)) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'project.error.projectIdInvalid',
            });
        }

        const share = await this.projectRepository.findShareByProjectAndUser(
            projectId,
            userId
        );

        if (!share?.project) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'projectShare.error.forbidden',
            });
        }

        if (share.project.status !== EnumProjectStatus.active) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'project.error.notFound',
            });
        }

        return {
            data: this.mapProject(share.project as Project),
        };
    }

    private async assertTenantExists(id: string) {
        if (!this.databaseUtil.checkIdIsValid(id)) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'tenant.error.xTenantIdInvalid',
            });
        }

        const tenant = await this.tenantRepository.findOneById(id);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'tenant.error.notFound',
            });
        }

        return tenant;
    }

    private async assertTenantExistsAndActive(id: string) {
        const tenant = await this.assertTenantExists(id);
        if (tenant.status !== EnumTenantStatus.active) {
            throw new ForbiddenException({
                statusCode: 403,
                message: 'tenant.error.inactive',
            });
        }

        return tenant;
    }

    private async assertProjectExists(
        tenantId: string,
        projectId: string
    ): Promise<Project> {
        if (!this.databaseUtil.checkIdIsValid(projectId)) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'project.error.projectIdInvalid',
            });
        }

        const project = await this.projectRepository.findOneByIdAndTenant(
            projectId,
            tenantId
        );
        if (!project) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'project.error.notFound',
            });
        }

        return project;
    }

    private mapProject(project: IProject): ProjectResponseDto {
        return {
            id: project.id,
            tenantId: project.tenantId,
            name: project.name,
            status: project.status,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }

    private mapShare(share: IProjectShare): ProjectShareResponseDto {
        return {
            id: share.id,
            projectId: share.projectId,
            userId: share.userId,
            access: share.access,
            createdAt: share.createdAt,
        };
    }

    private async resolveProjectRoleByName(roleName: string) {
        const roleInProjectScope = await this.roleRepository.existByNameAndScope(
            roleName,
            EnumRoleScope.project
        );

        if (roleInProjectScope) {
            return roleInProjectScope;
        }

        const role = await this.roleRepository.existByName(roleName);
        if (role && role.scope !== EnumRoleScope.project) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'projectRole.error.scopeMismatch',
            });
        }

        if (!role) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'projectRole.error.notFound',
            });
        }

        return role;
    }
}
