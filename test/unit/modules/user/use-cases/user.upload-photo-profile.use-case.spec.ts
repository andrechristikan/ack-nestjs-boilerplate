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
import type { IFile } from '@common/file/interfaces/file.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserPhotoSizeExceededException } from '@modules/user/exceptions/user.photo-size-exceeded.exception';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserUploadPhotoProfileUseCase } from '@modules/user/use-cases/user.upload-photo-profile.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserUploadPhotoProfileUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const tx = {} as IDatabaseTransactionClient;
    const file = {
        originalname: 'photo.png',
        size: 2048,
        buffer: Buffer.from('binary-data'),
    } as IFile;
    const photo: IAwsS3 = {
        bucket: 'bucket',
        key: 'photo-profile/user-sable/random.png',
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

    let useCase: UserUploadPhotoProfileUseCase;

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUploadPhotoProfileUseCase,
                { provide: UserProfileService, useValue: userProfileService },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();
        useCase = module.get(UserUploadPhotoProfileUseCase);
    });

    describe('execute', () => {
        it('prepares the upload then passes userContext.user.photo to replacePhotoProfileInTx in one transaction', async () => {
            userProfileService.prepareUploadPhotoProfile.mockResolvedValue(
                photo
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    file
                )
            ).resolves.toEqual({});

            expect(
                userProfileService.prepareUploadPhotoProfile
            ).toHaveBeenCalledWith(authContext, file);
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
                userProfileService.prepareUploadPhotoProfile
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
        });

        it('leaves withTransaction uncalled when prepareUploadPhotoProfile throws', async () => {
            userProfileService.prepareUploadPhotoProfile.mockRejectedValue(
                new UserPhotoSizeExceededException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    file
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoSizeExceeded,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised in the transaction', async () => {
            const error = new UserPhotoSizeExceededException();
            userProfileService.prepareUploadPhotoProfile.mockResolvedValue(
                photo
            );
            userProfileService.replacePhotoProfileInTx.mockRejectedValue(error);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    file
                )
            ).rejects.toBe(error);
        });

        it('wraps an unknown error raised in the transaction', async () => {
            userProfileService.prepareUploadPhotoProfile.mockResolvedValue(
                photo
            );
            userProfileService.replacePhotoProfileInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    file
                )
            ).rejects.toMatchObject({
                statusCode: EnumAppStatusCodeError.unknown,
            });
        });
    });
});
