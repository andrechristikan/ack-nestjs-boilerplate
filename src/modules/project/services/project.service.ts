import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { PolicyService } from '@modules/policy/services/policy.service';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { ProjectRoleAdmin } from '@modules/project/constants/project.constant';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import {
    IRequestAppWithProject,
    IRequestAppWithProjectTenant,
} from '@modules/project/interfaces/request.project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { HelperService } from '@common/helper/services/helper.service';
import {
    ConflictException,
    ForbiddenException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumProjectMemberStatus,
    EnumRoleScope,
    EnumTenantMemberRole,
} from '@generated/prisma-client';

@Injectable()
export class ProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly policyService: PolicyService,
        private readonly projectUtil: ProjectUtil,
        private readonly roleRepository: RoleRepository,
        private readonly userRepository: UserRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly helperService: HelperService
    ) {}

    // Tenant permissions authorize tenant-wide actions,
    // while project-resource actions are validated by project member permissions.

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

        const projectId = this.resolveProjectIdFromRequest(request);

        const projectMember =
            await this.projectRepository.findMemberByProjectAndUser(
                projectId,
                user.userId,
                EnumProjectMemberStatus.active
            );

        const tenantId = request.__tenant?.id;
        const tenantMemberRole = request.__tenantMember?.role;

        if (!projectMember) {
            if (
                tenantId &&
                (tenantMemberRole === EnumTenantMemberRole.owner ||
                    tenantMemberRole === EnumTenantMemberRole.admin)
            ) {
                const project = await this.projectRepository.findOneByIdAndTenant(
                    projectId,
                    tenantId
                );
                if (!project) {
                    throw new ForbiddenException({
                        statusCode: HttpStatus.FORBIDDEN,
                        message: 'project.member.error.forbidden',
                    });
                }

                return null;
            }

            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        if (projectMember.role.scope !== EnumRoleScope.project) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        if (tenantId && projectMember.project.tenantId !== tenantId) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        return projectMember;
    }

    async validateProjectPermissionGuard(
        request: IRequestAppWithProject,
        requiredAbilities: RoleAbilityRequestDto[]
    ): Promise<boolean> {
        if (requiredAbilities.length === 0) {
            throw new InternalServerErrorException({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'policy.error.predefinedNotFound',
            });
        }

        const tenantMemberRole = (request as IRequestAppWithProjectTenant)
            .__tenantMember?.role;
        const tenantId = (request as IRequestAppWithProjectTenant).__tenant?.id;
        if (
            tenantId &&
            (tenantMemberRole === EnumTenantMemberRole.owner ||
                tenantMemberRole === EnumTenantMemberRole.admin)
        ) {
            const projectId = this.resolveProjectIdFromRequest(
                request as IRequestAppWithProjectTenant
            );
            const project = await this.projectRepository.findOneByIdAndTenant(
                projectId,
                tenantId
            );
            if (project) {
                return true;
            }
        }

        if (!request.__projectAbilities) {
            const abilities = (request.__projectMember?.role?.abilities ??
                []) as RoleAbilityRequestDto[];
            request.__projectAbilities =
                this.policyService.createAbility(abilities);
        }

        const isAllowed = this.policyService.hasAbilities(
            request.__projectAbilities,
            requiredAbilities
        );

        if (!isAllowed) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        return true;
    }

    async createForUser(
        dto: ProjectCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const user = await this.userRepository.findOneById(createdBy);
        const tenantId = user?.lastTenantId;
        if (!tenantId) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        const tenantMember =
            await this.tenantRepository.findOneActiveMemberByTenantAndUser(
                tenantId,
                createdBy
            );
        if (!tenantMember) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        return this.createWithMembers(
            {
                tenantId,
            },
            dto,
            createdBy
        );
    }

    async createForTenant(
        tenantId: string,
        dto: ProjectCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.createWithMembers(
            {
                tenantId,
            },
            dto,
            createdBy
        );
    }

    async getListByTenant(
        tenantId: string,
        userId: string,
        tenantMemberRole: EnumTenantMemberRole,
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectSelect,
            Prisma.ProjectWhereInput
        >
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        const { data, ...others } =
            tenantMemberRole === EnumTenantMemberRole.owner ||
            tenantMemberRole === EnumTenantMemberRole.admin
                ? await this.projectRepository.findWithPaginationOffsetByTenant(
                      tenantId,
                      pagination
                  )
                : await this.projectRepository.findWithPaginationOffsetByTenantAndUser(
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
            project.tenantId,
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

    private async createWithMembers(
        ownership: {
            tenantId: string;
        },
        dto: ProjectCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const members = dto.members ?? [];
        const uniqueUserIds = new Set<string>();
        const resolvedMembers: Array<{ userId: string; roleId: string }> = [];

        for (const member of members) {
            if (member.userId === createdBy) {
                throw new ConflictException({
                    statusCode: HttpStatus.CONFLICT,
                    message: 'project.member.error.exist',
                });
            }

            if (uniqueUserIds.has(member.userId)) {
                throw new ConflictException({
                    statusCode: HttpStatus.CONFLICT,
                    message: 'project.member.error.exist',
                });
            }
            uniqueUserIds.add(member.userId);

            const [user, role] = await Promise.all([
                this.userRepository.findOneById(member.userId),
                this.roleRepository.existById(member.roleId),
            ]);

            if (!user) {
                throw new NotFoundException({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'project.member.error.userNotFound',
                });
            }

            if (!role) {
                throw new NotFoundException({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'project.role.error.notFound',
                });
            }

            if (role.scope !== EnumRoleScope.project) {
                throw new NotFoundException({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'project.role.error.notFound',
                });
            }

            resolvedMembers.push({
                userId: member.userId,
                roleId: role.id,
            });
        }

        const adminRole = await this.roleRepository.existByNameAndScope(
            ProjectRoleAdmin.trim(),
            EnumRoleScope.project
        );
        if (!adminRole) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.role.error.notFound',
            });
        }

        // FIXME: project creation and all subsequent createMember calls must be
        // wrapped in a single transaction. If any member creation fails, the project record
        // is left without its intended members and no rollback occurs.
        try {
            const name = dto.name.trim();
            const description = dto.description.trim();
            const slug = await this.createUniqueSlug(name, ownership.tenantId);
            const project = await this.projectRepository.create({
                ...ownership,
                name,
                description,
                slug,
                createdBy,
                updatedBy: createdBy,
            });

            await this.projectRepository.createMember({
                projectId: project.id,
                userId: createdBy,
                roleId: adminRole.id,
                status: EnumProjectMemberStatus.active,
                createdBy,
                updatedBy: createdBy,
            });

            for (const member of resolvedMembers) {
                await this.projectRepository.createMember({
                    projectId: project.id,
                    userId: member.userId,
                    roleId: member.roleId,
                    status: EnumProjectMemberStatus.active,
                    createdBy,
                    updatedBy: createdBy,
                });
            }

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
        tenantId: string,
        excludeProjectId?: string
    ): Promise<string> {
        const baseSlug = this.createSlug(value);
        let slug = baseSlug;

        for (let attempt = 0; attempt < 10; attempt++) {
            const existing = await this.projectRepository.findOneBySlugAndTenant(
                tenantId,
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
