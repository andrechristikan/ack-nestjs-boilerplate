import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { InviteService } from '@modules/invite/services/invite.service';
import { InviteUtil } from '@modules/invite/utils/invite.util';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { ProjectMemberInviteCreateRequestDto } from '@modules/project/dtos/request/project-member-invite.create.request.dto';
import { InviteCreateResponseDto } from '@modules/invite/dtos/response/invite-create.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectInviteType } from '@modules/project/constants/project.constant';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { UserService } from '@modules/user/services/user.service';
import { UserRepository } from '@modules/user/repositories/user.repository';
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
    EnumProjectStatus,
    EnumRoleScope,
    EnumRoleType,
    EnumUserSignUpFrom,
} from '@generated/prisma-client';

@Injectable()
export class ProjectMemberService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly roleRepository: RoleRepository,
        private readonly roleService: RoleService,
        private readonly userRepository: UserRepository,
        private readonly userService: UserService,
        private readonly inviteService: InviteService,
        private readonly inviteUtil: InviteUtil,
        private readonly projectUtil: ProjectUtil
    ) {}

    async create(
        projectId: string,
        dto: ProjectMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const [user, member] = await Promise.all([
            this.userRepository.findOneById(dto.userId),
            this.projectRepository.findMemberByProjectAndUser(
                projectId,
                dto.userId
            ),
        ]);

        if (!user) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.member.error.userNotFound',
            });
        }

        if (member) {
            throw new ConflictException({
                statusCode: HttpStatus.CONFLICT,
                message: 'project.member.error.exist',
            });
        }

        const role = await this.roleRepository.existById(dto.roleId);
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

        try {
            const projectMember = await this.projectRepository.createMember({
                projectId,
                userId: dto.userId,
                roleId: role.id,
                status: EnumProjectMemberStatus.active,
                createdBy,
                updatedBy: createdBy,
            });

            return {
                data: {
                    id: projectMember.id,
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

    async update(
        projectId: string,
        memberId: string,
        dto: ProjectMemberUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const member = await this.projectRepository.findOneMemberByIdAndProject(
            memberId,
            projectId
        );
        if (!member) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        let roleId: string | undefined;
        if (dto.roleId) {
            const role = await this.roleRepository.existById(dto.roleId);
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

            roleId = role.id;
        }

        if (dto.status === undefined && roleId === undefined) {
            return {};
        }

        try {
            await this.projectRepository.updateMember(member.id, {
                roleId,
                status: dto.status,
                updatedBy,
            });

            return {};
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async createInvite(
        projectId: string,
        dto: ProjectMemberInviteCreateRequestDto,
        createdBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<InviteCreateResponseDto>> {
        const [project, role] = await Promise.all([
            this.projectRepository.findOneById(projectId),
            this.roleRepository.existById(dto.roleId),
        ]);
        if (!project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.contextNotFound',
            });
        }

        if (!role || role.scope !== EnumRoleScope.project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.role.error.notFound',
            });
        }

        // FIXME: user creation, member creation, and invite creation
        // must be wrapped in a single transaction. If invite creation fails, the pending
        // member record and the stub user are left orphaned with no rollback.
        const normalizedEmail = dto.email.toLowerCase().trim();
        let user = await this.userRepository.findOneByEmail(normalizedEmail);
        if (!user) {
            user = await this.userService.createForInvitation(
                normalizedEmail,
                EnumUserSignUpFrom.project,
                requestLog,
                createdBy
            );
        }

        const existingMember =
            await this.projectRepository.findMemberByProjectAndUser(
                projectId,
                user.id
            );
        if (
            existingMember &&
            existingMember.status !== EnumProjectMemberStatus.pending
        ) {
            throw new ConflictException({
                statusCode: HttpStatus.CONFLICT,
                message: 'invite.error.memberExist',
            });
        }

        try {
            const memberId = existingMember
                ? existingMember.id
                : (
                      await this.projectRepository.createMember({
                          projectId,
                          userId: user.id,
                          roleId: role.id,
                          status: EnumProjectMemberStatus.pending,
                          createdBy,
                          updatedBy: createdBy,
                      })
                  ).id;

            const data = await this.inviteService.createInvite(
                {
                    inviteType: ProjectInviteType,
                    roleScope: EnumRoleScope.project,
                    contextId: projectId,
                    contextName: project.name,
                    memberId,
                    userId: user.id,
                },
                createdBy
            );

            return { data };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async claimInvite(
        token: string,
        firstName: string,
        lastName: string,
        password: string,
        requestLog: IRequestLog
    ): Promise<void> {
        const invite = await this.inviteService.getOneActiveByToken(
            token,
            ProjectInviteType
        );

        try {
            // FIXME: finalizeInviteSignup and updateMember must be wrapped in a single
            // transaction. If updateMember fails after signup completes, the user is activated
            // but the project member status remains pending indefinitely.
            await this.inviteService.signupByInvite(
                {
                    token,
                    inviteType: ProjectInviteType,
                    firstName,
                    lastName,
                    password,
                },
                requestLog
            );

            await this.projectRepository.updateMember(invite.memberId, {
                status: EnumProjectMemberStatus.active,
                updatedBy: invite.userId,
            });
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async sendInvite(
        projectId: string,
        memberId: string,
        requestedBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<InviteSendResponseDto>> {
        const member = await this.projectRepository.findOneMemberByIdAndProject(
            memberId,
            projectId
        );
        if (!member || !member.user) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.memberNotFound',
            });
        }

        const { id: inviteId } =
            await this.inviteService.getOneActiveByUserAndContext(
                member.user.id,
                ProjectInviteType,
                projectId
            );

        const data = await this.inviteService.sendInvite(
            inviteId,
            requestLog,
            requestedBy
        );

        return { data };
    }

    async getMemberRoles(
        projectId: string
    ): Promise<IResponseReturn<RoleListResponseDto[]>> {
        void projectId;

        return this.roleService.getListRolesByScopeAndType(
            EnumRoleScope.project,
            EnumRoleType.user
        );
    }

    async listMembers(
        projectId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectMemberSelect,
            Prisma.ProjectMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<ProjectMemberResponseDto>> {
        const { data, ...others } =
            await this.projectRepository.findMembersWithPaginationOffsetByProject(
                projectId,
                pagination
            );

        return {
            ...others,
            data: data.map(member =>
                this.projectUtil.mapMember(
                    member,
                    this.inviteUtil.mapInviteStatus(member.user.invites[0])
                )
            ),
        };
    }

    async list(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectMemberSelect,
            Prisma.ProjectMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<ProjectAccessResponseDto>> {
        const { data, ...others } =
            await this.projectRepository.findMembersWithPaginationOffsetByUser(
                userId,
                pagination
            );

        return {
            ...others,
            data: data.map(member =>
                this.projectUtil.mapMemberProjectAccess(member.project)
            ),
        };
    }

    async getOne(
        projectId: string,
        userId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const member = await this.projectRepository.findMemberByProjectAndUser(
            projectId,
            userId,
            EnumProjectMemberStatus.active
        );

        if (!member) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        if (member.project.status !== EnumProjectStatus.active) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.error.notFound',
            });
        }

        return {
            data: this.projectUtil.mapProject(member.project),
        };
    }
}
