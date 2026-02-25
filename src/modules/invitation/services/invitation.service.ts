import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { EmailService } from '@modules/email/services/email.service';
import {
    InvitationAcceptanceTarget,
    InvitationContext,
    InvitationProvider,
} from '@modules/invitation/interfaces/invitation.interface';
import { InvitationCreateRequestDto } from '@modules/invitation/dtos/request/invitation.create.request.dto';
import { InvitationCreateResponseDto } from '@modules/invitation/dtos/response/invitation-create.response.dto';
import { InvitationListResponseDto } from '@modules/invitation/dtos/response/invitation-list.response.dto';
import { InvitationPublicResponseDto } from '@modules/invitation/dtos/response/invitation-public.response.dto';
import { InvitationSendResponseDto } from '@modules/invitation/dtos/response/invitation-send.response.dto';
import { InvitationAcceptRequestDto } from '@modules/invitation/dtos/request/invitation-accept.request.dto';
import { InvitationCompleteRequestDto } from '@modules/invitation/dtos/request/invitation-complete.request.dto';
import { InvitationRepository } from '@modules/invitation/repositories/invitation.repository';
import { InvitationUtil } from '@modules/invitation/utils/invitation.util';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { UserService } from '@modules/user/services/user.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { EnumInvitationType, EnumUserStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { Duration } from 'luxon';

@Injectable()
export class InvitationService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService,
        private readonly userRepository: UserRepository,
        private readonly invitationRepository: InvitationRepository,
        private readonly helperService: HelperService,
        private readonly authUtil: AuthUtil,
        private readonly emailService: EmailService,
        private readonly invitationUtil: InvitationUtil
    ) {}

    async createInvitation(
        contextId: string,
        dto: InvitationCreateRequestDto,
        provider: InvitationProvider,
        requestLog: IRequestLog,
        createdBy: string
    ): Promise<IResponseReturn<InvitationCreateResponseDto>> {
        try {
            const role = await this.roleRepository.existById(dto.roleId);
            if (!role || role.scope !== provider.roleScope) {
                throw new NotFoundException({
                    statusCode: EnumRoleStatusCodeError.notFound,
                    message: 'role.error.notFound',
                });
            }

            const normalizedEmail = dto.email.toLowerCase().trim();
            let user = await this.userRepository.findOneByEmail(normalizedEmail);
            if (!user) {
                user = await this.userService.createForInvitation(
                    normalizedEmail,
                    provider.signUpFrom,
                    requestLog,
                    createdBy
                );
            }

            const existingMember = await provider.findMemberByUserId(
                contextId,
                user.id
            );

            if (existingMember && existingMember.status !== 'pending') {
                throw new ConflictException({
                    statusCode: HttpStatus.CONFLICT,
                    message: 'invitation.error.memberExist',
                });
            }

            const memberId =
                existingMember?.status === 'pending'
                    ? existingMember.id
                    : await provider.createMember(
                          contextId,
                          user.id,
                          role.id,
                          createdBy
                      );

            const contextName = await provider.getContextName(contextId);
            if (!contextName) {
                throw new NotFoundException({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'invitation.error.contextNotFound',
                });
            }

            let invitationRecord =
                await this.invitationRepository.findOneLatestActiveByUserAndContext(
                    user.id,
                    provider.invitationType,
                    contextId
                );

            if (!invitationRecord) {
                const invitationToken =
                    this.invitationUtil.createInvitationTokenPayload();

                invitationRecord = await this.invitationRepository.createInvitation(
                    {
                        userId: user.id,
                        userEmail: user.email,
                        token: invitationToken.token,
                        reference: invitationToken.reference,
                        expiresAt: invitationToken.expiresAt,
                        invitationType: provider.invitationType,
                        roleScope: provider.roleScope,
                        contextId,
                        contextName,
                        memberId,
                        requestedBy: createdBy,
                    },
                );
            }

            return {
                data: {
                    memberId,
                    userId: user.id,
                    email: user.email,
                    invitation: this.invitationUtil.mapInvitationStatus(
                        invitationRecord
                    ),
                },
            };
        } catch (err: unknown) {
            if (err instanceof HttpException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async sendInvitation(
        contextId: string,
        memberId: string,
        provider: InvitationProvider,
        requestLog: IRequestLog,
        requestedBy: string
    ): Promise<IResponseReturn<InvitationSendResponseDto>> {
        const userId = await provider.findMemberUserId(contextId, memberId);

        if (!userId) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invitation.error.memberNotFound',
            });
        }

        const contextName = await provider.getContextName(contextId);
        if (!contextName) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invitation.error.contextNotFound',
            });
        }

        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatusCodeError.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                message: 'user.error.inactive',
            });
        }

        try {
            const today = this.helperService.dateCreate();
            let invitation =
                await this.invitationRepository.findOneLatestActiveByUserAndContext(
                    user.id,
                    provider.invitationType,
                    contextId
                );

            if (!invitation) {
                const invitationContext: InvitationContext = {
                    invitationType: provider.invitationType,
                    roleScope: provider.roleScope,
                    contextId,
                    contextName,
                };
                const invitationPayload =
                    this.invitationUtil.createInvitationTokenPayload();

                invitation = await this.invitationRepository.createInvitation(
                    {
                        userId: user.id,
                        userEmail: user.email,
                        token: invitationPayload.token,
                        reference: invitationPayload.reference,
                        expiresAt: invitationPayload.expiresAt,
                        invitationType: invitationContext.invitationType,
                        roleScope: invitationContext.roleScope,
                        contextId: invitationContext.contextId,
                        contextName: invitationContext.contextName,
                        memberId,
                        requestedBy,
                    },
                );
            }

            const lastSentAt = invitation.sentAt;
            if (lastSentAt) {
                const canResendAt = this.helperService.dateForward(
                    lastSentAt,
                    Duration.fromObject({
                        minutes: this.invitationUtil.invitationResendInMinutes,
                    })
                );

                if (today < canResendAt) {
                    throw new BadRequestException({
                        statusCode:
                            EnumUserStatusCodeError.verificationEmailResendLimitExceeded,
                        message:
                            'project.member.error.invitationResendLimitExceeded',
                        messageProperties: {
                            resendIn: this.helperService.dateDiff(
                                today,
                                canResendAt
                            ).minutes,
                        },
                    });
                }
            }

            await this.emailService.sendInvitation(
                user.id,
                {
                    email: user.email,
                    username: user.username,
                },
                {
                    expiredAt: invitation.expiresAt.toISOString(),
                    reference: invitation.reference,
                    link: this.invitationUtil.createInvitationLink(
                        invitation.token
                    ),
                    expiredInMinutes: this.invitationUtil.invitationExpiredInMinutes,
                    invitationType:
                        provider.invitationType === EnumInvitationType.tenantMember
                            ? 'tenant_member'
                            : 'project_member',
                    roleScope: provider.roleScope,
                    contextName,
                }
            );

            await this.invitationRepository.markInvitationAsSent(
                invitation.id,
                user.id,
                requestedBy,
                requestLog
            );

            const resendAvailableAt = this.helperService.dateForward(
                today,
                Duration.fromObject({
                    minutes: this.invitationUtil.invitationResendInMinutes,
                })
            );

            const now = Date.now();
            return {
                data: {
                    invitation: {
                        status: 'pending',
                        expiresAt: invitation.expiresAt,
                        remainingSeconds: Math.max(
                            0,
                            Math.floor(
                                (invitation.expiresAt.getTime() - now) / 1000
                            )
                        ),
                        sentAt: new Date(),
                    },
                    resendAvailableAt,
                },
            };
        } catch (err: unknown) {
            if (err instanceof HttpException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    /**
     * Soft-deletes a pending invitation by setting `deletedAt` / `deletedBy`
     * on the invitation record.
     *
     * The token itself is NOT marked as used so it remains distinguishable
     * from a completed invitation in `mapInvitationStatus()`.
     */
    async deleteInvitation(
        userId: string,
        deletedBy: string
    ): Promise<IResponseReturn<void>> {
        const invitation =
            await this.invitationRepository.findOneLatestActiveByUserId(userId);
        if (!invitation) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invitation.error.notFound',
            });
        }

        await this.invitationRepository.softDelete(invitation.id, deletedBy);

        return {};
    }

    /**
     * Lists invitations filtered by invitation type and optional context.
     *
     * Queries `Invitation` records and filters by scalar invitation fields.
     */
    async listInvitations(options?: {
        invitationType?: EnumInvitationType;
        contextId?: string;
        userId?: string;
        includeDeleted?: boolean;
        pendingOnly?: boolean;
    }): Promise<IResponseReturn<InvitationListResponseDto[]>> {
        const invitations = await this.invitationRepository.findMany(options);

        return { data: this.invitationUtil.mapList(invitations) };
    }

    private async activatePendingMembership(
        client: Prisma.TransactionClient,
        userId: string,
        target: InvitationAcceptanceTarget
    ): Promise<void> {
        if (target.invitationType === EnumInvitationType.tenantMember) {
            const count =
                await this.invitationRepository.activatePendingTenantMember(
                    client,
                    userId,
                    target.contextId,
                    target.memberId
                );
            if (count > 0) {
                return;
            }

            const member =
                await this.invitationRepository.findTenantMemberForInvitation(
                    client,
                    userId,
                    target.contextId,
                    target.memberId
                );
            if (!member) {
                throw new NotFoundException({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'invitation.error.memberNotFound',
                });
            }
            if (member.status !== 'active') {
                throw new BadRequestException({
                    statusCode: EnumUserStatusCodeError.tokenInvalid,
                    message: 'user.error.invitationTokenInvalid',
                });
            }
            return;
        }

        const count = await this.invitationRepository.activatePendingProjectMember(
            client,
            userId,
            target.contextId,
            target.memberId
        );
        if (count > 0) {
            return;
        }

        const member = await this.invitationRepository.findProjectMemberForInvitation(
            client,
            userId,
            target.contextId,
            target.memberId
        );
        if (!member) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invitation.error.memberNotFound',
            });
        }
        if (member.status !== 'active') {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }
    }

    async getInvitation(
        token: string
    ): Promise<IResponseReturn<InvitationPublicResponseDto>> {
        const invitation =
            await this.invitationRepository.findOneByToken(token);
        if (!invitation) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }

        const today = this.helperService.dateCreate();
        let status: 'pending' | 'expired' | 'completed' | 'deleted' = 'pending';

        //TODO: invitation with deletedAt will never be returned by `findOneByToken` since it excludes deletedAt:null
        if (invitation.deletedAt) {
            status = 'deleted';
        } else if (invitation.acceptedAt) {
            status = 'completed';
        } else if (invitation.expiresAt <= today) {
            status = 'expired';
        }

        return {
            data: {
                email: invitation.user.email,
                isVerified: invitation.user.isVerified,
                status,
                expiresAt: invitation.expiresAt,
                remainingSeconds:
                    status === 'pending'
                        ? Math.max(
                              0,
                              Math.floor(
                                  (invitation.expiresAt.getTime() -
                                      today.getTime()) /
                                      1000
                              )
                          )
                        : undefined,
            },
        };
    }

    async acceptInvitation(
        { token }: InvitationAcceptRequestDto,
        userId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const invitation = await this.invitationRepository.findOneActiveByToken(token);
        if (!invitation) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }

        if (invitation.userId !== userId) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'http.clientError.forbidden',
            });
        }

        if (!invitation.user.isVerified) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'invitation.error.useCompleteInvitation',
            });
        }

        try {
            const acceptanceTarget: InvitationAcceptanceTarget = {
                invitationType: invitation.invitationType,
                contextId: invitation.contextId,
                ...(invitation.memberId ? { memberId: invitation.memberId } : {}),
            };

            await this.databaseService.$transaction(
                async (client: Prisma.TransactionClient) => {
                    await this.activatePendingMembership(
                        client,
                        invitation.userId,
                        acceptanceTarget
                    );
                    await this.invitationRepository.acceptInvitation(
                        client,
                        invitation.id,
                        invitation.userId,
                        requestLog
                    );
                }
            );

            return {};
        } catch (err: unknown) {
            if (err instanceof HttpException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async completeInvitation(
        {
            token,
            firstName,
            lastName,
            password,
        }: InvitationCompleteRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const invitation = await this.invitationRepository.findOneActiveByToken(token);
        if (!invitation) {
            throw new BadRequestException({
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                message: 'user.error.invitationTokenInvalid',
            });
        }
        if (invitation.user.isVerified) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'invitation.error.useAcceptInvitation',
            });
        }

        try {
            const acceptanceTarget: InvitationAcceptanceTarget = {
                invitationType: invitation.invitationType,
                contextId: invitation.contextId,
                ...(invitation.memberId ? { memberId: invitation.memberId } : {}),
            };

            const name = `${firstName.trim()} ${lastName.trim()}`.trim();
            const passwordPayload = this.authUtil.createPassword(password);

            await this.databaseService.$transaction(
                async (client: Prisma.TransactionClient) => {
                    await this.activatePendingMembership(
                        client,
                        invitation.userId,
                        acceptanceTarget
                    );
                    await this.invitationRepository.completeInvitation(
                        client,
                        invitation.id,
                        invitation.userId,
                        name,
                        passwordPayload,
                        requestLog
                    );
                }
            );

            await this.emailService.sendVerified(
                invitation.user.id,
                {
                    email: invitation.user.email,
                    username: invitation.user.username,
                },
                {
                    reference: invitation.reference,
                }
            );

            return {};
        } catch (err: unknown) {
            if (err instanceof HttpException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
