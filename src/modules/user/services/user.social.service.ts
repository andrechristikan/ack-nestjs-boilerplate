import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumUserLoginWith } from '@generated/prisma-client/client';
import { AuthSocialAppleInvalidException } from '@modules/auth/exceptions/auth.social-apple-invalid.exception';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import { UserSocialRepository } from '@modules/user/repositories/user.social.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserSocialService {
    constructor(private readonly userSocialRepository: UserSocialRepository) {}

    /** Returns the id of the user linked to the subject, or null when no link holds it. */
    async getUserIdBySubject(
        provider: EnumUserLoginWith,
        subject: string
    ): Promise<string | null> {
        const social =
            await this.userSocialRepository.findOneByProviderAndSubject(
                provider,
                subject
            );

        return social?.userId ?? null;
    }

    /** Throws the provider's invalid exception when the user holds any link for it; call it only after the token's subject matched no link. */
    async assertLinkable(
        userId: string,
        provider: EnumUserLoginWith
    ): Promise<void> {
        const social = await this.userSocialRepository.findOneByUserAndProvider(
            userId,
            provider
        );
        if (social === null) {
            return;
        }

        throw provider === EnumUserLoginWith.socialGoogle
            ? new AuthSocialGoogleInvalidException(
                  'Google subject does not match the linked account'
              )
            : new AuthSocialAppleInvalidException(
                  'Apple subject does not match the linked account'
              );
    }

    async linkInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        provider: EnumUserLoginWith,
        subject: string,
        createdBy: string
    ): Promise<void> {
        await this.userSocialRepository.createInTx(
            tx,
            userId,
            provider,
            subject,
            createdBy
        );
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        return this.userSocialRepository.deleteByUserInTx(tx, userId);
    }
}
