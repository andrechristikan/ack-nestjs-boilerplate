import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import type { UserPhoto } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPhotoContentInvalidException } from '@modules/user/exceptions/user.photo-content-invalid.exception';
import { UserPhotoKeyInvalidException } from '@modules/user/exceptions/user.photo-key-invalid.exception';
import { UserPhotoSizeExceededException } from '@modules/user/exceptions/user.photo-size-exceeded.exception';
import type { IUserPhotoProfileCheck } from '@modules/user/interfaces/user.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { UserUpdateProfilePhotoRequestDto } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';
import { UserUpdatePhotoProfileUseCase } from '@modules/user/use-cases/user.update-photo-profile.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserUpdatePhotoProfileUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const tx = {} as IDatabaseTransactionClient;
    const dto: UserUpdateProfilePhotoRequestDto = {
        key: 'photo-profile/user-sable/random.png',
    };
    const photo: IAwsS3 = {
        bucket: 'bucket',
        key: dto.key,
        cdnUrl: null,
        completedUrl: 'https://cdn.example.com/random.png',
        mime: 'image/png',
        extension: 'png',
        access: EnumAwsS3Accessibility.public,
        size: 2048,
    };
    const previousPhoto: UserPhoto = {
        bucket: 'bucket',
        key: 'photo-profile/user-sable/previous.png',
        cdnUrl: null,
        completedUrl: 'https://cdn.example.com/previous.png',
        mime: 'image/png',
        extension: 'png',
        access: EnumAwsS3Accessibility.public,
    };

    const userContext = buildUserContext({
        ...buildUser('user-sable', 'user-sable@example.com'),
        photo: previousPhoto,
    });
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: UserUpdatePhotoProfileUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUpdatePhotoProfileUseCase,
                { provide: UserProfileService, useValue: userProfileService },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();
        useCase = module.get(UserUpdatePhotoProfileUseCase);
    });

    describe('execute', () => {
        it('opens one transaction holding deleteRejectedPhotoInTx then rejects with UserPhotoContentInvalidException for invalid content', async () => {
            const check: IUserPhotoProfileCheck = {
                isSizeAllowed: true,
                isContentValid: false,
                photo,
            };
            userProfileService.checkPhotoProfile.mockResolvedValue(check);
            userProfileService.isPhotoProfileRejected.mockReturnValue(true);
            userProfileService.assertPhotoContentValid.mockImplementation(
                () => {
                    throw new UserPhotoContentInvalidException();
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoContentInvalid,
            });

            expect(userProfileService.checkPhotoProfile).toHaveBeenCalledWith(
                authContext,
                { key: dto.key }
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userProfileService.deleteRejectedPhotoInTx
            ).toHaveBeenCalledWith(tx, authContext.userId, photo);
            expect(
                userProfileService.assertPhotoContentValid
            ).toHaveBeenCalledWith(check);
            expect(
                userProfileService.deleteRejectedPhotoInTx
            ).toHaveBeenCalledBefore(
                userProfileService.assertPhotoContentValid
            );
            expect(
                userProfileService.replacePhotoProfileInTx
            ).not.toHaveBeenCalled();
        });

        it('opens one transaction holding deleteRejectedPhotoInTx then rejects with UserPhotoSizeExceededException for an oversize object, and replacePhotoProfileInTx is not called', async () => {
            const check: IUserPhotoProfileCheck = {
                isSizeAllowed: false,
                isContentValid: false,
                photo,
            };
            userProfileService.checkPhotoProfile.mockResolvedValue(check);
            userProfileService.isPhotoProfileRejected.mockReturnValue(true);
            userProfileService.assertPhotoSizeAllowed.mockImplementation(() => {
                throw new UserPhotoSizeExceededException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoSizeExceeded,
            });

            expect(
                userProfileService.isPhotoProfileRejected
            ).toHaveBeenCalledWith(check);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userProfileService.deleteRejectedPhotoInTx
            ).toHaveBeenCalledWith(tx, authContext.userId, photo);
            expect(
                userProfileService.assertPhotoSizeAllowed
            ).toHaveBeenCalledWith(check);
            expect(
                userProfileService.deleteRejectedPhotoInTx
            ).toHaveBeenCalledBefore(userProfileService.assertPhotoSizeAllowed);
            expect(
                userProfileService.assertPhotoContentValid
            ).not.toHaveBeenCalled();
            expect(
                userProfileService.replacePhotoProfileInTx
            ).not.toHaveBeenCalled();
        });

        it('passes userContext.user.photo to replacePhotoProfileInTx for valid content', async () => {
            const check: IUserPhotoProfileCheck = {
                isSizeAllowed: true,
                isContentValid: true,
                photo,
            };
            userProfileService.checkPhotoProfile.mockResolvedValue(check);
            userProfileService.isPhotoProfileRejected.mockReturnValue(false);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({});

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userProfileService.replacePhotoProfileInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                previousPhoto,
                photo
            );
            expect(
                userProfileService.deleteRejectedPhotoInTx
            ).not.toHaveBeenCalled();
        });

        it('leaves withTransaction uncalled when checkPhotoProfile throws', async () => {
            userProfileService.checkPhotoProfile.mockRejectedValue(
                new UserPhotoKeyInvalidException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoKeyInvalid,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('wraps an unknown error raised in the transaction', async () => {
            userProfileService.checkPhotoProfile.mockResolvedValue({
                isSizeAllowed: true,
                isContentValid: true,
                photo,
            });
            userProfileService.isPhotoProfileRejected.mockReturnValue(false);
            userProfileService.replacePhotoProfileInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
            });
        });
    });
});
