import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type { UserPhoto } from '@generated/prisma-client/client';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';
import { NotFound } from '@aws-sdk/client-s3';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import type {
    IAwsS3,
    IAwsS3Presign,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { FileSniffSizeInBytes } from '@common/file/constants/file.constant';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import type { IFile } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import type { IUserCheckUsername } from '@modules/user/interfaces/user.interface';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';

describe('UserProfileService', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-persimmon', 'user-persimmon@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const entry = buildActivityLogCreateManyEffect('activityLog');
    const configGet = vi.fn<(key: string) => number | string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const photoMaxSizeInBytes = 2048;
    const configValues: Record<string, number | string> = {
        'user.photo.filenameRandomLength': 24,
        'user.uploadPhotoProfilePathPattern': 'photo-profile/{userId}',
        'user.photo.maxSizeInBytes': photoMaxSizeInBytes,
    };

    let service: UserProfileService;

    const role: IRoleWithPolicies = {
        id: 'role-persimmon',
        name: 'user',
        description: null,
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        policyRevision: 0,
        isImmutable: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        policies: [],
    };
    const country: Country = {
        id: 'country-persimmon',
        name: 'Amber Coast',
        alpha2Code: 'PL',
        alpha3Code: 'PLD',
        phoneCode: ['+1'],
        continent: 'Atlantis',
        timezone: 'UTC',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const profile: IUserProfile = {
        id: 'user-persimmon',
        name: 'Persimmon Vale',
        username: 'persimmonVale',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'persimmon@example.com',
        roleId: role.id,
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.female,
        countryId: country.id,
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role,
        mobileNumbers: [],
        country,
    };

    const previousPhoto: UserPhoto = {
        id: 'photo-persimmon',
        userId: 'user-persimmon',
        bucket: 'bucket',
        key: 'photo-profile/user-persimmon/previous.png',
        cdnUrl: null,
        completedUrl: 'https://cdn.example.com/previous.png',
        mime: 'image/png',
        extension: 'png',
        access: 'public',
    };

    const tx = {} as IDatabaseTransactionClient;
    const deletePhotoEffect: IOutboxEffect = {
        queue: EnumUserQueue.user,
        name: EnumUserProcess.deletePhoto,
        data: {
            userId: 'user-persimmon',
            key: 'photo-profile/user-persimmon/previous.png',
            access: 'public',
        },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(key => configValues[key]);
        activityLogService.recordEffect.mockReturnValue(entry);
        userRepository.findOneById.mockResolvedValue(profile);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProfileService,
                { provide: UserRepository, useValue: userRepository },
                { provide: UserService, useValue: userService },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: FileService, useValue: fileService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = module.get(UserProfileService);
    });

    describe('getProfile', () => {
        it('returns the active profile', async () => {
            userRepository.findOneActiveProfileById.mockResolvedValue(profile);

            await expect(service.getProfile(profile.id)).resolves.toBe(profile);
        });

        it('throws UserNotFoundException when the profile is missing', async () => {
            userRepository.findOneActiveProfileById.mockResolvedValue(null);

            await expect(service.getProfile('missing')).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });
    });

    describe('updateProfileInTx', () => {
        it('updates the profile on the given transaction', async () => {
            await service.updateProfileInTx(tx, profile.id, {
                name: 'New Name',
                countryId: country.id,
                gender: EnumUserGender.male,
            });

            expect(userRepository.updateProfileInTx).toHaveBeenCalledWith(
                tx,
                profile.id,
                {
                    name: 'New Name',
                    countryId: country.id,
                    gender: EnumUserGender.male,
                }
            );
        });
    });

    describe('generatePhotoProfilePresign', () => {
        const presign: IAwsS3Presign = {
            key: 'photo-profile/user-persimmon/random.png',
            mime: 'image/png',
            extension: 'png',
            presignUrl: 'https://s3.example.com/presign',
            expiredInSeconds: 60,
        };

        it('returns the presign when S3 answers', async () => {
            fileService.createRandomFilename.mockReturnValue(
                'photo-profile/user-persimmon/random.png'
            );
            awsS3Service.presignPutItem.mockResolvedValue(presign);

            await expect(
                service.generatePhotoProfilePresign(profile.id, {
                    extension: EnumFileExtensionImage.png,
                    size: 2048,
                })
            ).resolves.toBe(presign);
            expect(awsS3Service.presignPutItem).toHaveBeenCalledWith(
                {
                    key: 'photo-profile/user-persimmon/random.png',
                    size: 2048,
                },
                {
                    forceUpdate: true,
                    access: EnumAwsS3Accessibility.public,
                }
            );
        });

        it('presigns a size at the configured maximum', async () => {
            fileService.createRandomFilename.mockReturnValue(
                'photo-profile/user-persimmon/random.png'
            );
            awsS3Service.presignPutItem.mockResolvedValue(presign);

            await expect(
                service.generatePhotoProfilePresign(profile.id, {
                    extension: EnumFileExtensionImage.png,
                    size: photoMaxSizeInBytes,
                })
            ).resolves.toBe(presign);
        });

        it('throws UserPhotoSizeExceededException above the configured maximum', async () => {
            const call = service.generatePhotoProfilePresign(profile.id, {
                extension: EnumFileExtensionImage.png,
                size: photoMaxSizeInBytes + 1,
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoSizeExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.photoSizeExceeded
                    ],
                messagePath: 'user.error.photoSizeExceeded',
            });
            expect(awsS3Service.presignPutItem).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 answers null', async () => {
            fileService.createRandomFilename.mockReturnValue(
                'photo-profile/user-persimmon/random.png'
            );
            awsS3Service.presignPutItem.mockResolvedValue(null);

            const call = service.generatePhotoProfilePresign(profile.id, {
                extension: EnumFileExtensionImage.png,
                size: 2048,
            });

            await expect(call).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3NotConfigured
                    ],
                messagePath: 'aws.error.s3NotConfigured',
            });
        });
    });

    describe('updatePhotoProfile', () => {
        const aws: IAwsS3 = {
            bucket: 'bucket',
            key: 'photo-profile/user-persimmon/random.png',
            cdnUrl: null,
            completedUrl: 'https://cdn.example.com/random.png',
            mime: 'image/png',
            extension: 'png',
            access: EnumAwsS3Accessibility.public,
            size: 2048,
        };

        const head = Buffer.from('persimmon-head');

        beforeEach(() => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            awsS3Service.getItemBytes.mockResolvedValue(head);
            fileService.isContentOfExtension.mockResolvedValue(true);
        });

        it('adds the delete effect then throws UserPhotoContentInvalidException when the head is not the extension, touching no user row', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            fileService.isContentOfExtension.mockResolvedValue(false);

            const call = service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                { key: aws.key }
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoContentInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.photoContentInvalid
                    ],
                messagePath: 'user.error.photoContentInvalid',
            });
            expect(fileService.isContentOfExtension).toHaveBeenCalledWith(
                head,
                aws.extension
            );
            expect(outboxService.add).toHaveBeenCalledWith({
                queue: EnumUserQueue.user,
                name: EnumUserProcess.deletePhoto,
                data: {
                    userId: profile.id,
                    key: aws.key,
                    access: EnumAwsS3Accessibility.public,
                },
                priority: EnumQueuePriority.low,
                idempotencyKey: null,
            });
            expect(userRepository.findOneById).not.toHaveBeenCalled();
            expect(
                userRepository.updatePhotoProfileInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the head with the key, the configured sniff size, and the public access', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);

            await service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                { key: aws.key }
            );

            expect(awsS3Service.getItemBytes).toHaveBeenCalledWith(
                aws.key,
                FileSniffSizeInBytes,
                { access: EnumAwsS3Accessibility.public }
            );
            expect(outboxService.add).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when the head read returns null', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            awsS3Service.getItemBytes.mockResolvedValue(null);

            const call = service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                { key: aws.key }
            );

            await expect(call).rejects.toMatchObject({
                module: 'aws',

                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
            expect(
                userRepository.updatePhotoProfileInTx
            ).not.toHaveBeenCalled();
        });

        it('heads the uploaded object and stores the headed item', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);

            await service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                { key: aws.key }
            );

            expect(awsS3Service.checkItem).toHaveBeenCalledWith(aws.key, {
                access: EnumAwsS3Accessibility.public,
            });
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userRepository.updatePhotoProfileInTx).toHaveBeenCalledWith(
                tx,
                profile.id,
                aws
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userUpdatePhotoProfile }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('caps the size of the headed object, not a client size', async () => {
            awsS3Service.checkItem.mockResolvedValue({
                ...aws,
                size: photoMaxSizeInBytes + 1,
            });

            const call = service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    key: aws.key,
                }
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoSizeExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.photoSizeExceeded
                    ],
                messagePath: 'user.error.photoSizeExceeded',
                httpStatus: 400,
            });
            expect(
                userRepository.updatePhotoProfileInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws UserPhotoKeyInvalidException and writes nothing when the object was never uploaded', async () => {
            awsS3Service.checkItem.mockRejectedValue(
                new NotFound({ message: 'missing', $metadata: {} })
            );

            const call = service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    key: aws.key,
                }
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoKeyInvalid,
                messagePath: 'user.error.photoKeyInvalid',
                httpStatus: 400,
            });
            expect(
                userRepository.updatePhotoProfileInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('writes the photo and adds the previous photo delete row on one outbox tx when a different photo exists', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue({
                ...profile,
                photo: previousPhoto,
            });

            await service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                { key: aws.key }
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userRepository.updatePhotoProfileInTx).toHaveBeenCalledWith(
                tx,
                profile.id,
                aws
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                deletePhotoEffect
            );
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                userRepository.updatePhotoProfileInTx
            );
        });

        it.each([
            'photo-profile/user-other/random.png',
            'photo-profile/user-persimmon-sibling/random.png',
            'term-policies/privacy/1/en.pdf',
        ])(
            'throws UserPhotoKeyInvalidException and heads nothing when the key %s is outside the user photo path',
            async foreignKey => {
                const call = service.updatePhotoProfile(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    {
                        key: foreignKey,
                    }
                );

                await expect(call).rejects.toMatchObject({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.photoKeyInvalid,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.photoKeyInvalid
                        ],
                    messagePath: 'user.error.photoKeyInvalid',
                    httpStatus: 400,
                });
                expect(awsS3Service.checkItem).not.toHaveBeenCalled();
                expect(
                    userRepository.updatePhotoProfileInTx
                ).not.toHaveBeenCalled();
                expect(outboxService.addInTx).not.toHaveBeenCalled();
            }
        );

        it('adds no row when the user has no previous photo', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);

            await service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                { key: aws.key }
            );

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
        });

        it.each([
            'photo-profile/user-other/previous.png',
            'photo-profile/user-persimmon-sibling/previous.png',
            'term-policies/privacy/1/en.pdf',
        ])(
            'adds no row when the previous photo key %s sits outside the user prefix',
            async foreignKey => {
                awsS3Service.checkItem.mockResolvedValue(aws);
                userRepository.findOneById.mockResolvedValue({
                    ...profile,
                    photo: { ...previousPhoto, key: foreignKey },
                });

                await service.updatePhotoProfile(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    { key: aws.key }
                );

                expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            }
        );

        it('adds no row when the previous photo has the same key', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue({
                ...profile,
                photo: { ...previousPhoto, key: aws.key },
            });

            await service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                { key: aws.key }
            );

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
        });

        it('adds no row and writes nothing when the user is missing', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue(null);

            const rejection = service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    key: aws.key,
                }
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });
            expect(
                userRepository.updatePhotoProfileInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            awsS3Service.checkItem.mockResolvedValue(null);

            const call = service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    key: aws.key,
                }
            );

            await expect(call).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3NotConfigured
                    ],
                messagePath: 'aws.error.s3NotConfigured',
            });
            expect(
                userRepository.updatePhotoProfileInTx
            ).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised while updating', async () => {
            const error = new UserNotFoundException();
            awsS3Service.checkItem.mockRejectedValue(error);

            const call = service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    key: aws.key,
                }
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while updating', async () => {
            const error = new Error('boom');
            awsS3Service.checkItem.mockRejectedValue(error);

            const call = service.updatePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    key: aws.key,
                }
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('uploadPhotoProfile', () => {
        const file = {
            originalname: 'photo.png',
            size: 2048,
            buffer: Buffer.from('binary-data'),
        } as IFile;
        const aws: IAwsS3 = {
            bucket: 'bucket',
            key: 'photo-profile/user-persimmon/random.png',
            cdnUrl: null,
            completedUrl: 'https://cdn.example.com/random.png',
            mime: 'image/png',
            extension: 'png',
            access: EnumAwsS3Accessibility.public,
            size: 2048,
        };

        beforeEach(() => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('uploads the file', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(
                'photo-profile/user-persimmon/random.png'
            );
            awsS3Service.putItem.mockResolvedValue(aws);

            await service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                file
            );

            expect(awsS3Service.putItem).toHaveBeenCalledWith(
                {
                    key: 'photo-profile/user-persimmon/random.png',
                    size: file.size,
                    file: file.buffer,
                },
                { access: EnumAwsS3Accessibility.public }
            );
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userRepository.updatePhotoProfileInTx).toHaveBeenCalledWith(
                tx,
                profile.id,
                aws
            );
        });

        it('throws FileExtensionInvalidException for an extension outside the image list', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue('exe');

            const call = service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                file
            );

            await expect(call).rejects.toBeInstanceOf(
                FileExtensionInvalidException
            );
            expect(awsS3Service.putItem).not.toHaveBeenCalled();
        });

        it('writes the photo and adds the previous photo delete row on one outbox tx when a different photo exists', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue({
                ...profile,
                photo: previousPhoto,
            });

            await service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                file
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userRepository.updatePhotoProfileInTx).toHaveBeenCalledWith(
                tx,
                profile.id,
                aws
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                deletePhotoEffect
            );
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                userRepository.updatePhotoProfileInTx
            );
        });

        it('adds no row when the user has no previous photo', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(aws);

            await service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                file
            );

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
        });

        it.each([
            'photo-profile/user-other/previous.png',
            'photo-profile/user-persimmon-sibling/previous.png',
            'term-policies/privacy/1/en.pdf',
        ])(
            'adds no row when the previous photo key %s sits outside the user prefix',
            async foreignKey => {
                fileService.extractExtensionFromFilename.mockReturnValue(
                    EnumFileExtensionImage.png
                );
                fileService.createRandomFilename.mockReturnValue(aws.key);
                awsS3Service.putItem.mockResolvedValue(aws);
                userRepository.findOneById.mockResolvedValue({
                    ...profile,
                    photo: { ...previousPhoto, key: foreignKey },
                });

                await service.uploadPhotoProfile(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    file
                );

                expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            }
        );

        it('adds no row when the previous photo has the same key', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue({
                ...profile,
                photo: { ...previousPhoto, key: aws.key },
            });

            await service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                file
            );

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
        });

        it('adds no row and writes nothing when the user is missing', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue(null);

            const rejection = service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                file
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });
            expect(
                userRepository.updatePhotoProfileInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 answers null', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(
                'photo-profile/user-persimmon/random.png'
            );
            awsS3Service.putItem.mockResolvedValue(null);

            const call = service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                file
            );

            await expect(call).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3NotConfigured
                    ],
                messagePath: 'aws.error.s3NotConfigured',
            });
            expect(
                userRepository.updatePhotoProfileInTx
            ).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised during upload', async () => {
            const error = new UserNotFoundException();
            fileService.extractExtensionFromFilename.mockImplementation(() => {
                throw error;
            });

            const call = service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                file
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised during upload', async () => {
            const error = new Error('boom');
            fileService.extractExtensionFromFilename.mockImplementation(() => {
                throw error;
            });

            const call = service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                file
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });

        it('throws UserPhotoSizeExceededException and uploads nothing when file.size exceeds the configured max', async () => {
            const oversizedFile = {
                ...file,
                size: photoMaxSizeInBytes + 1,
            } as IFile;

            const call = service.uploadPhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                oversizedFile
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoSizeExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.photoSizeExceeded
                    ],
                messagePath: 'user.error.photoSizeExceeded',
                httpStatus: 400,
            });
            expect(awsS3Service.putItem).not.toHaveBeenCalled();
            expect(
                userRepository.updatePhotoProfileInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('claimUsername', () => {
        const username: Lowercase<string> = 'persimmon';
        const available: IUserCheckUsername = {
            pattern: false,
            badWord: false,
            exist: false,
        };
        const taken: IUserCheckUsername = {
            pattern: true,
            badWord: true,
            exist: true,
        };

        beforeEach(() => {
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
        });

        it('claims the username', async () => {
            userService.checkUsername.mockResolvedValue(available);

            await service.claimUsername(
                requestContext,
                apiKeyContext,
                authContext,
                username
            );

            expect(userService.checkUsername).toHaveBeenCalledWith(username);
            expect(userService.assertUsernameAvailable).toHaveBeenCalledWith(
                available
            );
            expect(userRepository.existsByUsername).not.toHaveBeenCalled();
            expect(userRepository.claimUsernameInTx).toHaveBeenCalledWith(
                tx,
                profile.id,
                { username }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userClaimUsername }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('throws UserUsernameNotAllowedException when the pattern rejects it', async () => {
            userService.checkUsername.mockResolvedValue(taken);
            userService.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameNotAllowedException();
            });

            const call = service.claimUsername(
                requestContext,
                apiKeyContext,
                authContext,
                'bad name'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameNotAllowed,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameNotAllowed
                    ],
                messagePath: 'user.error.usernameNotAllowed',
            });
        });

        it('throws UserUsernameContainBadWordException when the word is blocked', async () => {
            userService.checkUsername.mockResolvedValue(taken);
            userService.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameContainBadWordException();
            });

            const call = service.claimUsername(
                requestContext,
                apiKeyContext,
                authContext,
                'damn'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameContainBadWord,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameContainBadWord
                    ],
                messagePath: 'user.error.usernameContainBadWord',
            });
        });

        it('throws UserUsernameExistException when the username is taken', async () => {
            userService.checkUsername.mockResolvedValue(taken);
            userService.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            const call = service.claimUsername(
                requestContext,
                apiKeyContext,
                authContext,
                username
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                messagePath: 'user.error.usernameExist',
            });
        });

        it('maps a username unique collision to UserUsernameExistException', async () => {
            userService.checkUsername.mockResolvedValue(available);
            const collision = new Error('unique');
            userRepository.claimUsernameInTx.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const call = service.claimUsername(
                requestContext,
                apiKeyContext,
                authContext,
                username
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                messagePath: 'user.error.usernameExist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'username'
            );
        });

        it('rethrows an AppBaseException raised while claiming', async () => {
            userService.checkUsername.mockResolvedValue(available);
            const error = new UserUsernameExistException();
            userRepository.claimUsernameInTx.mockRejectedValue(error);

            const call = service.claimUsername(
                requestContext,
                apiKeyContext,
                authContext,
                username
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                messagePath: 'user.error.usernameExist',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while claiming', async () => {
            userService.checkUsername.mockResolvedValue(available);
            const error = new Error('boom');
            userRepository.claimUsernameInTx.mockRejectedValue(error);

            const call = service.claimUsername(
                requestContext,
                apiKeyContext,
                authContext,
                username
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('deleteOwnedPhotoInTx', () => {
        it('adds the delete row of a photo under the profile path of the user on the given tx', async () => {
            await service.deleteOwnedPhotoInTx(tx, profile.id, previousPhoto);

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                deletePhotoEffect
            );
        });

        it('adds no row for a photo outside the profile path of the user', async () => {
            await service.deleteOwnedPhotoInTx(tx, profile.id, {
                ...previousPhoto,
                key: 'photo-profile/user-other/previous.png',
            });

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('adds no row for a user without a photo', async () => {
            await service.deleteOwnedPhotoInTx(tx, profile.id, null);

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('deletePhotoObject', () => {
        it('deletes the photo object in the given bucket access', async () => {
            await service.deletePhotoObject(
                'photo-profile/user-persimmon/previous.png',
                EnumAwsS3Accessibility.public
            );

            expect(awsS3Service.deleteItem).toHaveBeenCalledWith(
                'photo-profile/user-persimmon/previous.png',
                { access: EnumAwsS3Accessibility.public }
            );
        });

        it('rethrows the S3 failure', async () => {
            const failure = new Error('s3 down');
            awsS3Service.deleteItem.mockRejectedValue(failure);

            const rejection = service.deletePhotoObject(
                'photo-profile/user-persimmon/previous.png',
                EnumAwsS3Accessibility.public
            );

            await expect(rejection).rejects.toBe(failure);
        });
    });

    describe('createRandomFilenamePhotoProfileWithPath', () => {
        it('substitutes the userId in the configured path and delegates to the file service with the configured random length', () => {
            fileService.createRandomFilename.mockReturnValue(
                'photo-profile/user-persimmon/random.png'
            );

            const result = service.createRandomFilenamePhotoProfileWithPath(
                profile.id,
                { extension: EnumFileExtensionImage.png }
            );

            expect(result).toBe('photo-profile/user-persimmon/random.png');
            expect(fileService.createRandomFilename).toHaveBeenCalledWith({
                path: `photo-profile/${profile.id}`,
                extension: EnumFileExtensionImage.png,
                randomLength: 24,
            });
        });
    });

    describe('buildPhotoProfilePath', () => {
        it('substitutes the user id in the configured path', () => {
            expect(service['buildPhotoProfilePath']('user-marigold')).toBe(
                'photo-profile/user-marigold'
            );
        });

        it('keeps a replacement pattern in the user id literal', () => {
            expect(service['buildPhotoProfilePath']('$&')).toBe(
                'photo-profile/$&'
            );
        });
    });

    describe('isPhotoProfileKeyOwned', () => {
        it('returns true when the key sits under the user photo path', () => {
            expect(
                service['isPhotoProfileKeyOwned'](
                    'user-marigold',
                    'photo-profile/user-marigold/random.png'
                )
            ).toBe(true);
        });

        it.each([
            'photo-profile/user-other/random.png',
            'photo-profile/user-marigold-sibling/random.png',
            'photo-profile/user-marigold',
            'term-policies/privacy/1/en.pdf',
        ])(
            'returns false when the key %s sits outside the user photo path',
            key => {
                expect(
                    service['isPhotoProfileKeyOwned']('user-marigold', key)
                ).toBe(false);
            }
        );
    });

    describe('isPhotoSizeAllowed', () => {
        it('returns true at the configured maximum', () => {
            expect(service['isPhotoSizeAllowed'](photoMaxSizeInBytes)).toBe(
                true
            );
        });

        it('returns false above the configured maximum', () => {
            expect(service['isPhotoSizeAllowed'](photoMaxSizeInBytes + 1)).toBe(
                false
            );
        });
    });
});
