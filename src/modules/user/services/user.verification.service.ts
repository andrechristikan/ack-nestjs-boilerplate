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
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IUserVerificationEmailCreate,
    IUserVerificationEmailTarget,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserVerificationService {
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

    /** Resolves the unused, unexpired email verification of a raw token for an active user, with that user; throws when none matches or the user is already verified. */
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

    /** False when the user is verified or the last verification email is inside the resend window. */
    async isEmailResendable(user: User): Promise<boolean> {
        if (user.isVerified) {
            return false;
        }

        const lastVerification =
            await this.userVerificationRepository.findOneLatestByVerificationEmail(
                user.id
            );
        if (!lastVerification) {
            return true;
        }

        const isInsideResendWindow = this.userUtil.isInsideResendWindow(
            lastVerification.createdAt,
            this.userVerificationUtil.verificationResendInMinutes
        );

        return !isInsideResendWindow;
    }

    /** Resolves the active user of an email when isEmailResendable holds for it; null otherwise. */
    async getOneForResendByEmail(email: string): Promise<User | null> {
        const user = await this.userRepository.findOneActiveByEmail(email);
        if (!user) {
            return null;
        }

        const isResendable = await this.isEmailResendable(user);

        return isResendable ? user : null;
    }

    /** Marks the user verified and clears its password, password dates, and password attempt counter in the same write. */
    async markVerifiedBySocial(userId: string): Promise<User> {
        const verifiedAt = this.helperDateService.create();

        return this.userRepository.markVerifiedBySocial(userId, verifiedAt);
    }

    /** Creates an email verification for the user, replacing its active one, and returns it with the raw token and link. */
    async createEmail(
        userId: string,
        email: string
    ): Promise<IUserVerificationEmailCreate> {
        const verification = this.userVerificationUtil.createEmail();
        const today = this.helperDateService.create();

        await this.userVerificationRepository.createReplacingActive(
            userId,
            email,
            verification,
            today
        );

        return verification;
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
