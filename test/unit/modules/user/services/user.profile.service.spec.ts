import { setImmediate } from 'node:timers/promises';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Country, UserPhoto } from '@generated/prisma-client/client';
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
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IUserDeletePhotoEffect } from '@modules/user/interfaces/user.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserQueue } from '@modules/user/queues/user.queue';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { EnumFileStatusCodeError } from '@common/file/enums/file.status-code.enum';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('UserProfileService', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const userQueue: MockProxy<UserQueue> = mock<UserQueue>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-persimmon', 'user-persimmon@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const entry = buildActivityLogCreateManyEffect('activityLog');
    const photoMaxSizeInBytes = 2048;
    const configValues: Record<string, unknown> = {
        ...TestUnitKitConfigValues,
        'user.photo.filenameRandomLength': 24,
        'user.uploadPhotoProfilePathPattern': 'photo-profile/{userId}',
        'user.photo.maxSizeInBytes': photoMaxSizeInBytes,
    };

    let service: UserProfileService;

    const role: IRoleWithPolicies = {
        id: 'role-persimmon',
        name: 'user',
        description: null,
        type: EnumRoleType.user,
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
        lastIpAddress: null,
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
        bucket: 'bucket',
        key: 'photo-profile/user-persimmon/previous.png',
        cdnUrl: null,
        completedUrl: 'https://cdn.example.com/previous.png',
        mime: 'image/png',
        extension: 'png',
        access: 'public',
    };

    const tx = {} as IDatabaseTransactionClient;
    const deletePhotoEffect: IUserDeletePhotoEffect = {
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
        activityLogQueue.recordEffect.mockReturnValue(entry);
        userQueue.deletePhotoEffect.mockReturnValue(deletePhotoEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProfileService,
                { provide: UserRepository, useValue: userRepository },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: FileService, useValue: fileService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: UserQueue, useValue: userQueue },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        service = module.get(UserProfileService);
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
            });
        });
    });

    describe('checkPhotoProfile', () => {
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
            awsS3Service.getItemBytes.mockResolvedValue(head);
            fileService.isContentOfExtension.mockResolvedValue(true);
        });

        it('returns an invalid check without writing when the head is not the extension', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            fileService.isContentOfExtension.mockResolvedValue(false);

            await expect(
                service.checkPhotoProfile(authContext, { key: aws.key })
            ).resolves.toEqual({
                isSizeAllowed: true,
                isContentValid: false,
                photo: aws,
            });
            expect(fileService.isContentOfExtension).toHaveBeenCalledWith(
                head,
                aws.extension
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('reads the head with the key, the configured sniff size, and the public access', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);

            await service.checkPhotoProfile(authContext, { key: aws.key });

            expect(awsS3Service.getItemBytes).toHaveBeenCalledWith(
                aws.key,
                FileSniffSizeInBytes,
                { access: EnumAwsS3Accessibility.public }
            );
        });

        it('throws AwsS3NotConfiguredException when the head read returns null', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            awsS3Service.getItemBytes.mockResolvedValue(null);

            await expect(
                service.checkPhotoProfile(authContext, { key: aws.key })
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
        });

        it('heads the uploaded object, returns the headed item, and never reads the user', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);

            await expect(
                service.checkPhotoProfile(authContext, { key: aws.key })
            ).resolves.toEqual({
                isSizeAllowed: true,
                isContentValid: true,
                photo: aws,
            });
            expect(awsS3Service.checkItem).toHaveBeenCalledWith(aws.key, {
                access: EnumAwsS3Accessibility.public,
            });
            expect(userRepository.findOneById).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('returns the size verdict of the headed object, not a client size, without throwing', async () => {
            const oversize: IAwsS3 = {
                ...aws,
                size: photoMaxSizeInBytes + 1,
            };
            awsS3Service.checkItem.mockResolvedValue(oversize);

            await expect(
                service.checkPhotoProfile(authContext, { key: aws.key })
            ).resolves.toEqual({
                isSizeAllowed: false,
                isContentValid: true,
                photo: oversize,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('reads the head bytes while the object check is still pending', async () => {
            const itemCheck = buildDeferred<IAwsS3>();
            awsS3Service.checkItem.mockReturnValue(itemCheck.promise);

            const running = service.checkPhotoProfile(authContext, {
                key: aws.key,
            });

            expect(awsS3Service.getItemBytes).toHaveBeenCalledWith(
                aws.key,
                FileSniffSizeInBytes,
                { access: EnumAwsS3Accessibility.public }
            );

            itemCheck.resolve(aws);
            await running;
        });

        it('throws UserPhotoKeyInvalidException when the object was never uploaded', async () => {
            awsS3Service.checkItem.mockRejectedValue(
                new NotFound({ message: 'missing', $metadata: {} })
            );

            await expect(
                service.checkPhotoProfile(authContext, { key: aws.key })
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoKeyInvalid,
            });
        });

        it.each([
            'photo-profile/user-other/random.png',
            'photo-profile/user-persimmon-sibling/random.png',
            'term-policies/privacy/1/en.pdf',
        ])(
            'throws UserPhotoKeyInvalidException and heads nothing when the key %s is outside the user photo path',
            async foreignKey => {
                await expect(
                    service.checkPhotoProfile(authContext, {
                        key: foreignKey,
                    })
                ).rejects.toMatchObject({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.photoKeyInvalid,
                });
                expect(awsS3Service.checkItem).not.toHaveBeenCalled();
            }
        );

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            awsS3Service.checkItem.mockResolvedValue(null);

            await expect(
                service.checkPhotoProfile(authContext, { key: aws.key })
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
        });

        it('rethrows an AppBaseException raised while checking', async () => {
            const error = new UserNotFoundException();
            awsS3Service.checkItem.mockRejectedValue(error);

            await expect(
                service.checkPhotoProfile(authContext, { key: aws.key })
            ).rejects.toBe(error);
        });

        it('wraps an unknown error raised while checking', async () => {
            const error = new Error('boom');
            awsS3Service.checkItem.mockRejectedValue(error);

            await expect(
                service.checkPhotoProfile(authContext, { key: aws.key })
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });
    });

    describe('assertPhotoContentValid', () => {
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

        it('throws UserPhotoContentInvalidException for invalid content', () => {
            expect(() =>
                service.assertPhotoContentValid({
                    isSizeAllowed: true,
                    isContentValid: false,
                    photo: aws,
                })
            ).toThrowError(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.photoContentInvalid,
                })
            );
        });

        it('returns for valid content', () => {
            expect(() =>
                service.assertPhotoContentValid({
                    isSizeAllowed: true,
                    isContentValid: true,
                    photo: aws,
                })
            ).not.toThrow();
        });
    });

    describe('assertPhotoSizeAllowed', () => {
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

        it('throws UserPhotoSizeExceededException for an oversize object', () => {
            expect(() =>
                service.assertPhotoSizeAllowed({
                    isSizeAllowed: false,
                    isContentValid: true,
                    photo: aws,
                })
            ).toThrowError(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.photoSizeExceeded,
                })
            );
        });

        it('returns for an object within the cap', () => {
            expect(() =>
                service.assertPhotoSizeAllowed({
                    isSizeAllowed: true,
                    isContentValid: true,
                    photo: aws,
                })
            ).not.toThrow();
        });
    });

    describe('isPhotoProfileRejected', () => {
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

        it.each([
            [true, true, false],
            [false, true, true],
            [true, false, true],
            [false, false, true],
        ])(
            'answers for isSizeAllowed %s and isContentValid %s that the photo is rejected: %s',
            (isSizeAllowed, isContentValid, expected) => {
                expect(
                    service.isPhotoProfileRejected({
                        isSizeAllowed,
                        isContentValid,
                        photo: aws,
                    })
                ).toBe(expected);
            }
        );
    });

    describe('deleteRejectedPhotoInTx', () => {
        it('adds the delete effect of the rejected photo on the given tx', async () => {
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

            await service.deleteRejectedPhotoInTx(tx, profile.id, aws);

            expect(userQueue.deletePhotoEffect).toHaveBeenCalledWith(
                profile.id,
                aws
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                deletePhotoEffect
            );
        });
    });

    describe('replacePhotoProfileInTx', () => {
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

        it('writes the photo and adds the previous photo delete row and the entry on the given tx when a different photo exists', async () => {
            await service.replacePhotoProfileInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                previousPhoto,
                aws
            );

            expect(userRepository.updatePhotoProfileInTx).toHaveBeenCalledWith(
                tx,
                profile.id,
                aws
            );
            expect(userQueue.deletePhotoEffect).toHaveBeenCalledWith(
                profile.id,
                previousPhoto
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                deletePhotoEffect
            );
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                userRepository.updatePhotoProfileInTx
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { action: EnumActivityLogAction.userPhotoProfileUpdated }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('adds the previous photo delete row while the photo write is pending and adds no entry when it fails', async () => {
            const written = buildDeferred<never>();
            const failure = new Error('write failed');
            userRepository.updatePhotoProfileInTx.mockReturnValue(
                written.promise
            );

            const running = service.replacePhotoProfileInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                previousPhoto,
                aws
            );
            await setImmediate();

            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                deletePhotoEffect
            );

            written.reject(failure);

            await expect(running).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalledWith(tx, entry);
        });

        it('adds only the entry when the user has no previous photo', async () => {
            await service.replacePhotoProfileInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                aws
            );

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it.each([
            'photo-profile/user-other/previous.png',
            'photo-profile/user-persimmon-sibling/previous.png',
            'term-policies/privacy/1/en.pdf',
        ])(
            'adds no delete row when the previous photo key %s sits outside the user prefix',
            async foreignKey => {
                await service.replacePhotoProfileInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    { ...previousPhoto, key: foreignKey },
                    aws
                );

                expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            }
        );

        it('adds no delete row when the previous photo has the same key', async () => {
            await service.replacePhotoProfileInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                { ...previousPhoto, key: aws.key },
                aws
            );

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
        });
    });

    describe('prepareUploadPhotoProfile', () => {
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

        it('uploads the file and returns the photo without reading the user', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(aws);

            await expect(
                service.prepareUploadPhotoProfile(authContext, file)
            ).resolves.toEqual(aws);
            expect(awsS3Service.putItem).toHaveBeenCalledWith(
                {
                    key: aws.key,
                    size: file.size,
                    file: file.buffer,
                },
                { access: EnumAwsS3Accessibility.public }
            );
            expect(userRepository.findOneById).not.toHaveBeenCalled();
        });

        it('throws FileExtensionInvalidException for an extension outside the image list', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue('exe');

            await expect(
                service.prepareUploadPhotoProfile(authContext, file)
            ).rejects.toMatchObject({
                module: 'file',
                statusCode: EnumFileStatusCodeError.extensionInvalid,
            });
            expect(awsS3Service.putItem).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 answers null', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(null);

            await expect(
                service.prepareUploadPhotoProfile(authContext, file)
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
        });

        it('rethrows an AppBaseException raised during upload', async () => {
            const error = new UserNotFoundException();
            fileService.extractExtensionFromFilename.mockImplementation(() => {
                throw error;
            });

            await expect(
                service.prepareUploadPhotoProfile(authContext, file)
            ).rejects.toBe(error);
        });

        it('wraps an unknown error raised during upload', async () => {
            const error = new Error('boom');
            fileService.extractExtensionFromFilename.mockImplementation(() => {
                throw error;
            });

            await expect(
                service.prepareUploadPhotoProfile(authContext, file)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: error,
            });
        });

        it('throws UserPhotoSizeExceededException and uploads nothing when file.size exceeds the configured max', async () => {
            const oversizedFile = {
                ...file,
                size: photoMaxSizeInBytes + 1,
            } as IFile;

            await expect(
                service.prepareUploadPhotoProfile(authContext, oversizedFile)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoSizeExceeded,
            });
            expect(awsS3Service.putItem).not.toHaveBeenCalled();
        });
    });

    describe('claimUsernameInTx', () => {
        const username: Lowercase<string> = 'persimmon';

        it('claims the username and adds the entry on the given tx', async () => {
            await service.claimUsernameInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                username
            );

            expect(userRepository.claimUsernameInTx).toHaveBeenCalledWith(
                tx,
                profile.id,
                { username }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { action: EnumActivityLogAction.userUsernameClaimed }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                userRepository.claimUsernameInTx
            );
        });
    });

    describe('deleteOwnedPhotoInTx', () => {
        it('adds the delete row of a photo under the profile path of the user on the given tx', async () => {
            await service.deleteOwnedPhotoInTx(tx, profile.id, previousPhoto);

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(userQueue.deletePhotoEffect).toHaveBeenCalledWith(
                profile.id,
                previousPhoto
            );
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
