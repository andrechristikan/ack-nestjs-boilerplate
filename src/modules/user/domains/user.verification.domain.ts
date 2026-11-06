import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { User, Verification } from '@generated/prisma-client/client';
import { UserEmailAlreadyVerifiedException } from '@modules/user/exceptions/user.email-already-verified.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserVerificationEmailResendLimitExceededException } from '@modules/user/exceptions/user.verification-email-resend-limit-exceeded.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IUserVerificationCreate,
    IUserVerificationEmailTarget,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserVerificationDomain {
    constructor(
        private readonly userVerificationRepository: UserVerificationRepository,
        private readonly userRepository: UserRepository,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly userUtil: UserUtil,
        private readonly userVerificationUtil: UserVerificationUtil
    ) {}

    /** Resolves the active email verification of a raw token with its user, whatever the user status. */
    async getOneActiveByEmailToken(
        token: string
    ): Promise<IUserVerificationEmailTarget> {
        const hashedToken = this.helperHashService.sha256Hash(token);
        const verification =
            await this.userVerificationRepository.findOneActiveByVerificationEmailToken(
                hashedToken
            );
        if (!verification) {
            throw new UserTokenInvalidException();
        }

        const user = await this.userRepository.findOneById(verification.userId);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.isVerified) {
            throw new UserEmailAlreadyVerifiedException();
        }

        return { verification, user };
    }

    async verifyEmail(verification: Verification): Promise<void> {
        try {
            const verifiedAt = this.helperDateService.create();
            await this.databaseService.withTransaction(async tx => {
                const isMarkedUsed =
                    await this.userVerificationRepository.markUsedInTx(
                        tx,
                        verification.id,
                        verifiedAt
                    );
                if (!isMarkedUsed) {
                    throw new UserTokenInvalidException();
                }
                await this.userRepository.markVerifiedInTx(
                    tx,
                    verification.userId,
                    verifiedAt
                );
            });

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserTokenInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Resolves the active, unverified user of an email whose last verification email is out of its resend window; null when the email holds no active, unverified user. */
    async getOneForResendByEmail(email: string): Promise<User | null> {
        const user = await this.userRepository.findOneActiveByEmail(email);
        if (!user || user.isVerified) {
            return null;
        }

        // Sequential by design: gate before the work it guards
        const lastVerification =
            await this.userVerificationRepository.findOneLatestByVerificationEmail(
                user.id
            );
        if (lastVerification) {
            const waitInMinutes = this.userUtil.getResendWaitInMinutes(
                lastVerification.createdAt,
                this.userVerificationUtil.verificationResendInMinutes
            );
            if (waitInMinutes !== null) {
                throw new UserVerificationEmailResendLimitExceededException(
                    waitInMinutes
                );
            }
        }

        return user;
    }

    async markVerified(userId: string): Promise<void> {
        const verifiedAt = this.helperDateService.create();

        await this.userRepository.markVerified(userId, verifiedAt);
    }

    async persistVerificationEmail(
        userId: string,
        email: string,
        verification: IUserVerificationCreate
    ): Promise<void> {
        const today = this.helperDateService.create();

        await this.userVerificationRepository.createReplacingActive(
            userId,
            email,
            verification,
            today
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verification: IUserCreateVerification,
        createdBy: string
    ): Promise<Verification> {
        return this.userVerificationRepository.createInTx(
            tx,
            userId,
            verification,
            createdBy
        );
    }
}
