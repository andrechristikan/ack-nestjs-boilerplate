import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { VerificationVerifyEmailRequestDto } from '@modules/verification/dtos/request/verification.verify-email.request.dto';
import { IVerificationCreate } from '@modules/verification/interfaces/verification.interface';
import { Injectable } from '@nestjs/common';
import {
    ENUM_ACTIVITY_LOG_ACTION,
    ENUM_USER_STATUS,
    ENUM_VERIFICATION_TYPE,
    Prisma,
    User,
    Verification,
} from '@prisma/client';

@Injectable()
export class VerificationRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService
    ) {}

    async findOneActiveEmailByToken({
        token,
    }: VerificationVerifyEmailRequestDto): Promise<
        (Verification & { user: User }) | null
    > {
        const today = this.helperService.dateCreate();

        return this.databaseService.verification.findFirst({
            where: {
                token,
                isUsed: false,
                type: ENUM_VERIFICATION_TYPE.EMAIL,
                expiredAt: {
                    gt: today,
                },
                user: {
                    deletedAt: null,
                    status: ENUM_USER_STATUS.ACTIVE,
                },
            },
            include: {
                user: true,
            },
        });
    }

    async verifyEmail(
        id: string,
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<Verification> {
        const today = this.helperService.dateCreate();

        return this.databaseService.verification.update({
            where: {
                id,
            },
            data: {
                isUsed: true,
                verifiedAt: today,
                user: {
                    update: {
                        verifiedAt: today,
                        isVerified: true,
                        activityLogs: {
                            create: {
                                action: ENUM_ACTIVITY_LOG_ACTION.USER_VERIFIED_EMAIL,
                                ipAddress,
                                userAgent:
                                    this.databaseService.toPlainObject(
                                        userAgent
                                    ),
                                createdBy: userId,
                            },
                        },
                    },
                },
            },
        });
    }

    async resendEmailByUser(
        userId: string,
        userEmail: string,
        { expiredAt, reference, token, type }: IVerificationCreate
    ): Promise<Verification> {
        const today = this.helperService.dateCreate();

        return this.databaseService.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const activeVerification = await tx.verification.findFirst({
                    where: {
                        userId,
                        type,
                        isUsed: false,
                        expiredAt: {
                            gt: today,
                        },
                    },
                    select: {
                        id: true,
                    },
                });

                const promises = [
                    this.databaseService.verification.create({
                        data: {
                            expiredAt,
                            reference,
                            token,
                            type,
                            userId,
                            to: userEmail,
                            createdBy: reference,
                            createdAt: today,
                        },
                    }),
                ];

                if (activeVerification) {
                    promises.push(
                        tx.verification.update({
                            where: {
                                id: activeVerification.id,
                            },
                            data: {
                                expiredAt: today,
                            },
                        })
                    );
                }

                const [newVerification] = await Promise.all(promises);

                return newVerification;
            }
        );
    }
}
