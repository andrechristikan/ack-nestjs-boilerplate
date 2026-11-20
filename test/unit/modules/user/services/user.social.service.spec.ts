import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumUserLoginWith } from '@generated/prisma-client/client';
import type { UserSocial } from '@generated/prisma-client/client';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { UserSocialRepository } from '@modules/user/repositories/user.social.repository';
import { UserSocialService } from '@modules/user/services/user.social.service';

describe('UserSocialService', () => {
    const userSocialRepository: MockProxy<UserSocialRepository> =
        mock<UserSocialRepository>();
    let service: UserSocialService;

    const tx = {} as IDatabaseTransactionClient;
    const social: UserSocial = {
        id: 'social-bramble',
        userId: 'user-bramble',
        provider: EnumUserLoginWith.socialGoogle,
        subject: 'subject-bramble',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSocialService,
                {
                    provide: UserSocialRepository,
                    useValue: userSocialRepository,
                },
            ],
        }).compile();
        service = module.get(UserSocialService);
    });

    describe('getUserIdBySubject', () => {
        it('returns the id of the user linked to the subject', async () => {
            userSocialRepository.findOneByProviderAndSubject.mockResolvedValue(
                social
            );

            await expect(
                service.getUserIdBySubject(
                    EnumUserLoginWith.socialGoogle,
                    'subject-bramble'
                )
            ).resolves.toBe('user-bramble');

            expect(
                userSocialRepository.findOneByProviderAndSubject
            ).toHaveBeenCalledWith(
                EnumUserLoginWith.socialGoogle,
                'subject-bramble'
            );
        });

        it('returns null when no link holds the subject', async () => {
            userSocialRepository.findOneByProviderAndSubject.mockResolvedValue(
                null
            );

            await expect(
                service.getUserIdBySubject(
                    EnumUserLoginWith.socialApple,
                    'subject-bramble'
                )
            ).resolves.toBeNull();
        });
    });

    describe('assertLinkable', () => {
        it('resolves when the user holds no link for the provider', async () => {
            userSocialRepository.findOneByUserAndProvider.mockResolvedValue(
                null
            );

            await expect(
                service.assertLinkable(
                    'user-bramble',
                    EnumUserLoginWith.socialGoogle
                )
            ).resolves.toBeUndefined();

            expect(
                userSocialRepository.findOneByUserAndProvider
            ).toHaveBeenCalledWith(
                'user-bramble',
                EnumUserLoginWith.socialGoogle
            );
        });

        it('throws the google invalid exception when the user holds a google link', async () => {
            userSocialRepository.findOneByUserAndProvider.mockResolvedValue(
                social
            );

            await expect(
                service.assertLinkable(
                    'user-bramble',
                    EnumUserLoginWith.socialGoogle
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialGoogleInvalid,
                rawError: 'Google subject does not match the linked account',
            });
        });

        it('throws the apple invalid exception when the user holds an apple link', async () => {
            userSocialRepository.findOneByUserAndProvider.mockResolvedValue({
                ...social,
                provider: EnumUserLoginWith.socialApple,
            });

            await expect(
                service.assertLinkable(
                    'user-bramble',
                    EnumUserLoginWith.socialApple
                )
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.socialAppleInvalid,
                rawError: 'Apple subject does not match the linked account',
            });
        });
    });

    describe('linkInTx', () => {
        it('creates the link on the transaction', async () => {
            userSocialRepository.createInTx.mockResolvedValue();

            await service.linkInTx(
                tx,
                'user-bramble',
                EnumUserLoginWith.socialApple,
                'subject-bramble'
            );

            expect(userSocialRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginWith.socialApple,
                'subject-bramble'
            );
        });
    });

    describe('removeByUserInTx', () => {
        it('returns the count of links removed on the transaction', async () => {
            userSocialRepository.deleteByUserInTx.mockResolvedValue(1);

            await expect(
                service.removeByUserInTx(tx, 'user-bramble')
            ).resolves.toBe(1);

            expect(userSocialRepository.deleteByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble'
            );
        });
    });
});
