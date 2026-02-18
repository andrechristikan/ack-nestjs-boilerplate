import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    InvitationContext,
    InvitationProvider,
} from '@modules/invitation/interfaces/invitation.interface';
import { InvitationCreateRequestDto } from '@modules/invitation/dtos/request/invitation.create.request.dto';
import { InvitationCreateResponseDto } from '@modules/invitation/dtos/response/invitation-create.response.dto';
import { InvitationSendResponseDto } from '@modules/invitation/dtos/response/invitation-send.response.dto';
import { InvitationStatusResponseDto } from '@modules/invitation/dtos/response/invitation-status.response.dto';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import {
    ConflictException,
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';

@Injectable()
export class InvitationService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly userRepository: UserRepository,
        private readonly userService: UserService
    ) {}

    async createInvitation(
        contextId: string,
        dto: InvitationCreateRequestDto,
        provider: InvitationProvider,
        requestLog: IRequestLog,
        createdBy: string
    ): Promise<IResponseReturn<InvitationCreateResponseDto>> {
        const role = await this.roleRepository.existById(dto.roleId);
        if (!role || role.scope !== provider.roleScope) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
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

        const memberExists = await provider.existsMember(
            contextId,
            user.id
        );
        if (memberExists) {
            throw new ConflictException({
                statusCode: HttpStatus.CONFLICT,
                message: 'invitation.error.memberExist',
            });
        }

        try {
            const memberId = await provider.addMember(
                contextId,
                user.id,
                role.id,
                createdBy
            );

            const latestInvitation =
                await this.userRepository.findOneLatestByInvitation(user.id);

            return {
                data: {
                    memberId,
                    userId: user.id,
                    email: user.email,
                    invitation: this.mapInvitationStatus(
                        user.isVerified,
                        user.verifiedAt,
                        latestInvitation
                    ),
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

    async sendInvitation(
        contextId: string,
        memberId: string,
        provider: InvitationProvider,
        requestLog: IRequestLog,
        requestedBy: string
    ): Promise<IResponseReturn<InvitationSendResponseDto>> {
        const [userId, contextName] = await Promise.all([
            provider.findMemberUserId(contextId, memberId),
            provider.getContextName(contextId),
        ]);
        if (!userId) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invitation.error.memberNotFound',
            });
        }
        if (!contextName) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'invitation.error.contextNotFound',
            });
        }

        const invitationContext: InvitationContext = {
            invitationType: provider.invitationType,
            roleScope: provider.roleScope,
            contextId,
            contextName,
        };

        try {
            const invitation = await this.userService.sendInvitationByUserId(
                userId,
                invitationContext,
                requestLog,
                requestedBy
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
                    resendAvailableAt: invitation.resendAvailableAt,
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

    mapInvitationStatus(
        isVerified: boolean,
        verifiedAt?: Date,
        invitation?: {
            createdAt?: Date;
            expiredAt?: Date;
            isUsed?: boolean;
            verifiedAt?: Date;
        }
    ): InvitationStatusResponseDto {
        if (isVerified) {
            return {
                status: 'completed',
                completedAt: verifiedAt,
            };
        }

        if (!invitation?.expiredAt) {
            return {
                status: 'not_sent',
            };
        }

        if (invitation.isUsed) {
            return {
                status: 'completed',
                completedAt: invitation.verifiedAt ?? verifiedAt,
            };
        }

        const now = Date.now();
        if (invitation.expiredAt.getTime() <= now) {
            return {
                status: 'expired',
                expiresAt: invitation.expiredAt,
                sentAt: invitation.createdAt,
            };
        }

        return {
            status: 'pending',
            expiresAt: invitation.expiredAt,
            sentAt: invitation.createdAt,
            remainingSeconds: Math.max(
                0,
                Math.floor((invitation.expiredAt.getTime() - now) / 1000)
            ),
        };
    }
}
