import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { HelperService } from '@common/helper/services/helper.service';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { IConfigInvite } from '@configs/invite.config';
import { InvitePublicResponseDto } from '@modules/invite/dtos/response/invite-public.response.dto';
import { InviteSendResponseDto } from '@modules/invite/dtos/response/invite-send.response.dto';
import { InviteUtil } from '@modules/invite/utils/invite.util';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { ProjectInviteType } from '@modules/project/constants/project.constant';
import { ProjectMemberInviteCreateRequestDto } from '@modules/project/dtos/request/project-member-invite.create.request.dto';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
import { ProjectInviteResponseDto } from '@modules/project/dtos/response/project-invite.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { EnumProjectInviteStatus } from '@modules/project/enums/project-invite.status.enum';
import { ProjectInviteRepository } from '@modules/project/repositories/project-invite.repository';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    ConflictException,
    ForbiddenException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumProjectInviteStatus as EnumProjectInviteStatusDb,
    EnumProjectMemberRole,
    EnumProjectMemberStatus,
    EnumRoleScope,
    EnumTenantMemberRole,
    EnumTenantMemberStatus,
    Prisma,
    ProjectInvite,
} from '@generated/prisma-client';
import { plainToInstance } from 'class-transformer';
import { Duration } from 'luxon';

@Injectable()
export class ProjectMemberService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly projectInviteRepository: ProjectInviteRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly userRepository: UserRepository,
        private readonly inviteUtil: InviteUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly projectUtil: ProjectUtil,
        private readonly helperService: HelperService,
        private readonly configService: ConfigService
    ) {}

    private getInviteConfig(): IConfigInvite['project'] {
        return this.configService.getOrThrow<IConfigInvite>('invite').project;
    }

    private mapInviteStatus(
        invite: Pick<
            ProjectInvite,
            'status' | 'expiresAt' | 'acceptedAt' | 'revokedAt'
        >
    ): Pick<
        ProjectInviteResponseDto,
        'status' | 'remainingSeconds' | 'expiresAt' | 'acceptedAt' | 'revokedAt'
    > {
        const now = Date.now();

        if (
            invite.status === EnumProjectInviteStatusDb.revoked ||
            invite.revokedAt
        ) {
            return {
                status: EnumProjectInviteStatus.revoked,
                revokedAt: invite.revokedAt ?? undefined,
                expiresAt: invite.expiresAt,
            };
        }

        if (
            invite.status === EnumProjectInviteStatusDb.accepted ||
            invite.acceptedAt
        ) {
            return {
                status: EnumProjectInviteStatus.accepted,
                acceptedAt: invite.acceptedAt,
                expiresAt: invite.expiresAt,
            };
        }

        if (invite.expiresAt.getTime() <= now) {
            return {
                status: EnumProjectInviteStatus.expired,
                expiresAt: invite.expiresAt,
            };
        }

        return {
            status: EnumProjectInviteStatus.pending,
            expiresAt: invite.expiresAt,
            remainingSeconds: Math.max(
                0,
                Math.floor((invite.expiresAt.getTime() - now) / 1000)
            ),
        };
    }

    private mapInvite(
        invite: Pick<
            ProjectInvite,
            | 'id'
            | 'invitedById'
            | 'invitedEmail'
            | 'projectId'
            | 'projectRole'
            | 'status'
            | 'expiresAt'
            | 'acceptedAt'
            | 'revokedAt'
            | 'revokedById'
            | 'createdAt'
        >
    ): ProjectInviteResponseDto {
        return plainToInstance(ProjectInviteResponseDto, {
            id: invite.id,
            invitedById: invite.invitedById,
            invitedEmail: invite.invitedEmail,
            projectId: invite.projectId,
            projectRole: invite.projectRole,
            revokedById: invite.revokedById,
            createdAt: invite.createdAt,
            ...this.mapInviteStatus(invite),
        });
    }

    async create(
        projectId: string,
        dto: ProjectMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const [project, user, member] = await Promise.all([
            this.projectRepository.findOneById(projectId),
            this.userRepository.findOneById(dto.userId),
            this.projectRepository.findMemberByProjectAndUser(
                projectId,
                dto.userId
            ),
        ]);
        if (!project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.error.notFound',
            });
        }

        if (!user) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.member.error.userNotFound',
            });
        }
        await this.assertIsActiveTenantMember(project.tenantId, user.id);

        if (member) {
            throw new ConflictException({
                statusCode: HttpStatus.CONFLICT,
                message: 'project.member.error.exist',
            });
        }

        try {
            const projectMember = await this.projectRepository.createMember({
                projectId,
                userId: dto.userId,
                role: dto.role,
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

        if (dto.status === undefined && dto.role === undefined) {
            return {};
        }

        try {
            await this.projectRepository.updateMember(member.id, {
                role: dto.role,
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
        _requestLog: IRequestLog
    ): Promise<IResponseReturn<ProjectInviteResponseDto>> {
        const project = await this.projectRepository.findOneById(projectId);
        if (!project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.contextNotFound',
            });
        }

        const normalizedEmail = dto.email.toLowerCase().trim();
        const user = await this.userRepository.findOneByEmail(normalizedEmail);
        if (!user) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.member.error.userNotFound',
            });
        }

        await this.assertIsActiveTenantMember(project.tenantId, user.id);

        const existingMember = await this.projectRepository.findMemberByProjectAndUser(
            projectId,
            user.id
        );
        if (
            existingMember &&
            existingMember.status === EnumProjectMemberStatus.active
        ) {
            throw new ConflictException({
                statusCode: HttpStatus.CONFLICT,
                message: 'project.member.error.exist',
            });
        }

        try {
            const existingPendingInvite =
                await this.projectInviteRepository.findOnePendingByEmailAndProject(
                    normalizedEmail,
                    projectId
                );
            if (existingPendingInvite) {
                await this.projectInviteRepository.revoke(
                    existingPendingInvite.id,
                    createdBy
                );
            }

            const inviteConfig = this.getInviteConfig();
            const effectiveExpiredInMinutes = dto.expiresIn
                ? dto.expiresIn * 24 * 60
                : inviteConfig.expiredInMinutes;
            const tokenInfo = this.inviteUtil.createInviteToken({
                ...inviteConfig,
                expiredInMinutes: effectiveExpiredInMinutes,
            });

            const invite = await this.projectInviteRepository.create({
                invitedById: createdBy,
                invitedEmail: normalizedEmail,
                projectId,
                projectRole: dto.role,
                status: EnumProjectInviteStatusDb.pending,
                token: tokenInfo.token,
                expiresAt: tokenInfo.expiresAt,
                createdBy,
                updatedBy: createdBy,
            });

            await this.notificationUtil.sendInvite(
                user.id,
                {
                    link: tokenInfo.link,
                    expiredAt: tokenInfo.expiresAt,
                    expiredInMinutes: effectiveExpiredInMinutes,
                    reference: tokenInfo.reference,
                    inviteType: ProjectInviteType,
                    roleScope: EnumRoleScope.project,
                    contextName: project.name,
                },
                createdBy
            );

            await this.projectInviteRepository.markSent(invite.id, createdBy);

            return { data: this.mapInvite(invite) };
        } catch (err: unknown) {
            if (
                err instanceof ConflictException ||
                err instanceof ForbiddenException ||
                err instanceof NotFoundException
            ) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async getInviteByToken(token: string): Promise<InvitePublicResponseDto> {
        const invite = await this.projectInviteRepository.findOneByToken(token);
        if (!invite) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.notFound',
            });
        }

        const user = await this.userRepository.findOneByEmail(invite.invitedEmail);
        if (!user) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.member.error.userNotFound',
            });
        }

        const status = this.mapInviteStatus(invite);

        return {
            email: invite.invitedEmail,
            isVerified: user.isVerified,
            status:
                status.status === EnumProjectInviteStatus.accepted
                    ? 'completed'
                    : status.status === EnumProjectInviteStatus.revoked
                      ? 'deleted'
                      : status.status,
            expiresAt: status.expiresAt,
            remainingSeconds: status.remainingSeconds,
        };
    }

    async claimRegistered(
        token: string,
        userId: string,
        _requestLog: IRequestLog
    ): Promise<void> {
        const invite = await this.projectInviteRepository.findOneActiveByToken(
            token
        );
        if (!invite) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.notFound',
            });
        }

        const user = await this.userRepository.findOneById(userId);
        if (!user || user.email !== invite.invitedEmail) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'http.clientError.forbidden',
            });
        }

        const project = await this.projectRepository.findOneById(invite.projectId);
        if (!project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.error.notFound',
            });
        }

        await this.assertIsActiveTenantMember(project.tenantId, userId);

        try {
            const existingMember =
                await this.projectRepository.findMemberByProjectAndUser(
                    project.id,
                    userId
                );
            if (existingMember) {
                if (existingMember.status === EnumProjectMemberStatus.active) {
                    throw new ConflictException({
                        statusCode: HttpStatus.CONFLICT,
                        message: 'project.member.error.exist',
                    });
                }

                await this.projectRepository.updateMember(existingMember.id, {
                    role: invite.projectRole,
                    status: EnumProjectMemberStatus.active,
                    updatedBy: userId,
                });
            } else {
                await this.projectRepository.createMember({
                    projectId: project.id,
                    userId,
                    role: invite.projectRole,
                    status: EnumProjectMemberStatus.active,
                    createdBy: userId,
                    updatedBy: userId,
                });
            }

            await this.projectInviteRepository.accept(invite.id, userId);
        } catch (err: unknown) {
            if (
                err instanceof ConflictException ||
                err instanceof ForbiddenException ||
                err instanceof NotFoundException ||
                err instanceof UnprocessableEntityException
            ) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async sendInvite(
        projectId: string,
        inviteId: string,
        requestedBy: string,
        _requestLog: IRequestLog
    ): Promise<IResponseReturn<InviteSendResponseDto>> {
        const invite = await this.projectInviteRepository.findOneByIdAndProject(
            inviteId,
            projectId
        );
        if (!invite) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.notFound',
            });
        }

        const status = this.mapInviteStatus(invite);
        if (status.status !== EnumProjectInviteStatus.pending) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.inviteAlreadyExpired',
            });
        }

        const user = await this.userRepository.findOneByEmail(invite.invitedEmail);
        if (!user) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.member.error.userNotFound',
            });
        }

        const project = await this.projectRepository.findOneById(projectId);
        if (!project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.error.notFound',
            });
        }

        const inviteConfig = this.getInviteConfig();
        if (invite.sentAt) {
            const canResendAt = this.helperService.dateForward(
                invite.sentAt,
                Duration.fromObject({ minutes: inviteConfig.resendInMinutes })
            );
            if (this.helperService.dateCreate() < canResendAt) {
                throw new ForbiddenException({
                    statusCode: HttpStatus.FORBIDDEN,
                    message: 'project.member.error.inviteResendLimitExceeded',
                });
            }
        }

        const link = this.inviteUtil.createInviteLink(invite.token, inviteConfig);
        await this.notificationUtil.sendInvite(
            user.id,
            {
                link,
                expiredAt: invite.expiresAt,
                expiredInMinutes: inviteConfig.expiredInMinutes,
                reference: invite.id,
                inviteType: ProjectInviteType,
                roleScope: EnumRoleScope.project,
                contextName: project.name,
            },
            requestedBy
        );

        const sentAt = await this.projectInviteRepository.markSent(
            invite.id,
            requestedBy
        );

        return {
            data: {
                invite: this.inviteUtil.mapInviteStatus({
                    expiresAt: invite.expiresAt,
                    sentAt,
                    acceptedAt: invite.acceptedAt,
                    deletedAt: invite.revokedAt,
                }),
                resendAvailableAt: this.helperService.dateForward(
                    sentAt,
                    Duration.fromObject({ minutes: inviteConfig.resendInMinutes })
                ),
            },
        };
    }

    async revokeInvite(
        projectId: string,
        inviteId: string,
        revokedBy: string
    ): Promise<IResponseReturn<void>> {
        const invite = await this.projectInviteRepository.findOneByIdAndProject(
            inviteId,
            projectId
        );
        if (!invite) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invite.error.notFound',
            });
        }

        const status = this.mapInviteStatus(invite);
        if (status.status === EnumProjectInviteStatus.accepted) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.inviteAlreadyAccepted',
            });
        }

        if (status.status === EnumProjectInviteStatus.revoked) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.inviteAlreadyRevoked',
            });
        }

        if (status.status === EnumProjectInviteStatus.expired) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.inviteAlreadyExpired',
            });
        }

        await this.projectInviteRepository.revoke(invite.id, revokedBy);
        return {};
    }

    async listInvites(
        projectId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectInviteSelect,
            Prisma.ProjectInviteWhereInput
        >
    ): Promise<IResponsePagingReturn<ProjectInviteResponseDto>> {
        const { data, ...others } =
            await this.projectInviteRepository.findWithPaginationOffset(
                projectId,
                pagination
            );

        return {
            ...others,
            data: data.map(invite => this.mapInvite(invite)),
        };
    }

    async getMemberRoles(
        projectId: string
    ): Promise<IResponseReturn<EnumProjectMemberRole[]>> {
        void projectId;

        return {
            data: Object.values(EnumProjectMemberRole),
        };
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
                    this.inviteUtil.mapInviteStatus(
                        member.user.projectInvites[0]
                            ? {
                                  expiresAt: member.user.projectInvites[0]
                                      .expiresAt,
                                  acceptedAt: member.user.projectInvites[0]
                                      .acceptedAt,
                                  deletedAt:
                                      member.user.projectInvites[0].revokedAt,
                              }
                            : undefined
                    )
                )
            ),
        };
    }

    async leave(
        projectId: string,
        userId: string
    ): Promise<IResponseReturn<void>> {
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

        const deletedAt = this.helperService.dateCreate();

        if (member.role !== EnumProjectMemberRole.admin) {
            await this.projectRepository.softDeleteMember(member.id, {
                deletedAt,
                deletedBy: userId,
                updatedBy: userId,
            });
            return {};
        }

        const otherMemberCount =
            await this.projectRepository.countActiveMembersByProject(
                projectId,
                userId
            );

        if (otherMemberCount === 0) {
            await this.projectRepository.deleteWithCascade(projectId, userId);
            return {};
        }

        const anotherAdmin =
            await this.projectRepository.findAnotherAdminMember(
                projectId,
                userId
            );
        if (!anotherAdmin) {
            throw new UnprocessableEntityException({
                statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                message: 'project.member.error.lastAdmin',
            });
        }

        await this.projectRepository.softDeleteMember(member.id, {
            deletedAt,
            deletedBy: userId,
            updatedBy: userId,
        });

        return {};
    }

    async revoke(
        projectId: string,
        memberId: string,
        revokedBy: string,
        tenantMemberRole: EnumTenantMemberRole | undefined,
        projectMemberRole: EnumProjectMemberRole | undefined
    ): Promise<IResponseReturn<void>> {
        const isTenantPrivileged =
            tenantMemberRole === EnumTenantMemberRole.owner ||
            tenantMemberRole === EnumTenantMemberRole.admin;
        const isProjectAdmin =
            projectMemberRole === EnumProjectMemberRole.admin;

        if (!isTenantPrivileged && !isProjectAdmin) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.cannotRevoke',
            });
        }

        const member = await this.projectRepository.findOneMemberByIdAndProject(
            memberId,
            projectId
        );
        if (!member) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.member.error.forbidden',
            });
        }

        const deletedAt = this.helperService.dateCreate();

        try {
            await this.projectRepository.softDeleteMember(member.id, {
                deletedAt,
                deletedBy: revokedBy,
                updatedBy: revokedBy,
            });

            if (member.user) {
                const activeInvite =
                    await this.projectInviteRepository.findOnePendingByEmailAndProject(
                        member.user.email,
                        projectId
                    );

                if (activeInvite) {
                    await this.projectInviteRepository.revoke(
                        activeInvite.id,
                        revokedBy
                    );
                }
            }

            return {};
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    private async assertIsActiveTenantMember(
        tenantId: string,
        userId: string
    ): Promise<void> {
        const tenantMember =
            await this.tenantRepository.findMemberByTenantAndUser(
                tenantId,
                userId
            );
        if (!tenantMember || tenantMember.status !== EnumTenantMemberStatus.active) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.notTenantMember',
            });
        }
    }
}
