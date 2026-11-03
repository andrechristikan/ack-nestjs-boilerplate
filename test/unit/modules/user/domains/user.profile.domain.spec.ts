import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type {
    Country,
    TwoFactor,
    UserPhoto,
} from '@generated/prisma-client/client';
import { NotFound } from '@aws-sdk/client-s3';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import type {
    IAwsS3,
    IAwsS3Presign,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import type { IFile } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';

describe('UserProfileDomain', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const userQueue: MockProxy<UserQueue> = mock<UserQueue>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const photoMaxSizeInBytes = 2048;

    let domain: UserProfileDomain;

    const role: IRoleWithPolicies = {
        id: 'role-persimmon',
        name: 'user',
        description: null,
        type: EnumRoleType.user,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        policies: [],
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-persimmon',
        userId: 'user-persimmon',
        secret: null,
        pendingSecret: null,
        backupCodes: [],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
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
        twoFactor,
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

    beforeEach(async () => {
        vi.resetAllMocks();

        userUtil.buildPhotoProfilePath.mockImplementation(
            userId => `photo-profile/${userId}`
        );
        userUtil.isPhotoProfileKeyOwned.mockImplementation((userId, key) =>
            key.startsWith(`photo-profile/${userId}/`)
        );
        userUtil.isPhotoSizeAllowed.mockImplementation(
            size => size <= photoMaxSizeInBytes
        );
        userRepository.findOneById.mockResolvedValue(profile);
        userQueue.deletePhoto.mockResolvedValue();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProfileDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: UserUtil, useValue: userUtil },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: FileService, useValue: fileService },
                { provide: UserQueue, useValue: userQueue },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        domain = module.get(UserProfileDomain);
    });

    describe('getProfile', () => {
        it('returns the active profile', async () => {
            userRepository.findOneActiveProfileById.mockResolvedValue(profile);

            await expect(domain.getProfile(profile.id)).resolves.toBe(profile);
        });

        it('throws UserNotFoundException when the profile is missing', async () => {
            userRepository.findOneActiveProfileById.mockResolvedValue(null);

            await expect(domain.getProfile('missing')).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });
    });

    describe('updateProfile', () => {
        it('updates the profile', async () => {
            await domain.updateProfile(profile.id, {
                name: 'New Name',
                countryId: country.id,
                gender: EnumUserGender.male,
            });

            expect(userRepository.updateProfile).toHaveBeenCalledWith(
                profile.id,
                {
                    name: 'New Name',
                    countryId: country.id,
                    gender: EnumUserGender.male,
                }
            );
        });

        it('rethrows an AppBaseException raised while updating', async () => {
            const error = new UserNotFoundException();
            userRepository.updateProfile.mockRejectedValue(error);

            const call = domain.updateProfile(profile.id, {
                countryId: country.id,
                name: null,
                gender: EnumUserGender.male,
            });

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
            userRepository.updateProfile.mockRejectedValue(error);

            const call = domain.updateProfile(profile.id, {
                countryId: country.id,
                name: null,
                gender: EnumUserGender.male,
            });

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
                domain.generatePhotoProfilePresign(profile.id, {
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
                domain.generatePhotoProfilePresign(profile.id, {
                    extension: EnumFileExtensionImage.png,
                    size: photoMaxSizeInBytes,
                })
            ).resolves.toBe(presign);
        });

        it('throws UserPhotoSizeExceededException above the configured maximum', async () => {
            const call = domain.generatePhotoProfilePresign(profile.id, {
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

            const call = domain.generatePhotoProfilePresign(profile.id, {
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

        it('heads the uploaded object and stores the headed item', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);

            await domain.updatePhotoProfile(profile.id, { key: aws.key });

            expect(awsS3Service.checkItem).toHaveBeenCalledWith(aws.key, {
                access: EnumAwsS3Accessibility.public,
            });
            expect(userRepository.updatePhotoProfile).toHaveBeenCalledWith(
                profile.id,
                aws
            );
        });

        it('caps the size of the headed object, not a client size', async () => {
            awsS3Service.checkItem.mockResolvedValue({
                ...aws,
                size: photoMaxSizeInBytes + 1,
            });

            const call = domain.updatePhotoProfile(profile.id, {
                key: aws.key,
            });

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
            expect(userUtil.isPhotoSizeAllowed).toHaveBeenCalledWith(
                photoMaxSizeInBytes + 1
            );
            expect(userRepository.updatePhotoProfile).not.toHaveBeenCalled();
            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });

        it('throws UserPhotoKeyInvalidException and writes nothing when the object was never uploaded', async () => {
            awsS3Service.checkItem.mockRejectedValue(
                new NotFound({ message: 'missing', $metadata: {} })
            );

            const call = domain.updatePhotoProfile(profile.id, {
                key: aws.key,
            });

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.photoKeyInvalid,
                messagePath: 'user.error.photoKeyInvalid',
                httpStatus: 400,
            });
            expect(userRepository.updatePhotoProfile).not.toHaveBeenCalled();
            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });

        it('enqueues the previous photo delete after the write when a different photo exists', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            const calls: string[] = [];
            userRepository.findOneById.mockResolvedValue({
                ...profile,
                photo: previousPhoto,
            });
            userRepository.updatePhotoProfile.mockImplementation(async () => {
                calls.push('write');

                return profile;
            });
            userQueue.deletePhoto.mockImplementation(async () => {
                calls.push('enqueue');
            });

            await domain.updatePhotoProfile(profile.id, { key: aws.key });

            expect(userQueue.deletePhoto).toHaveBeenCalledWith(
                profile.id,
                previousPhoto
            );
            expect(calls).toEqual(['write', 'enqueue']);
        });

        it.each([
            'photo-profile/user-other/random.png',
            'photo-profile/user-persimmon-sibling/random.png',
            'term-policies/privacy/1/en.pdf',
        ])(
            'throws UserPhotoKeyInvalidException and heads nothing when the key %s is outside the user photo path',
            async foreignKey => {
                const call = domain.updatePhotoProfile(profile.id, {
                    key: foreignKey,
                });

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
                    userRepository.updatePhotoProfile
                ).not.toHaveBeenCalled();
                expect(userQueue.deletePhoto).not.toHaveBeenCalled();
            }
        );

        it('enqueues nothing when the user has no previous photo', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);

            await domain.updatePhotoProfile(profile.id, { key: aws.key });

            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });

        it.each([
            'photo-profile/user-other/previous.png',
            'photo-profile/user-persimmon-sibling/previous.png',
            'term-policies/privacy/1/en.pdf',
        ])(
            'enqueues nothing when the previous photo key %s sits outside the user prefix',
            async foreignKey => {
                awsS3Service.checkItem.mockResolvedValue(aws);
                userRepository.findOneById.mockResolvedValue({
                    ...profile,
                    photo: { ...previousPhoto, key: foreignKey },
                });

                await domain.updatePhotoProfile(profile.id, { key: aws.key });

                expect(userQueue.deletePhoto).not.toHaveBeenCalled();
            }
        );

        it('enqueues nothing when the previous photo has the same key', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue({
                ...profile,
                photo: { ...previousPhoto, key: aws.key },
            });

            await domain.updatePhotoProfile(profile.id, { key: aws.key });

            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });

        it('enqueues nothing and writes nothing when the user is missing', async () => {
            awsS3Service.checkItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue(null);

            const rejection = domain.updatePhotoProfile(profile.id, {
                key: aws.key,
            });

            await expect(rejection).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });
            expect(userRepository.updatePhotoProfile).not.toHaveBeenCalled();
            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            awsS3Service.checkItem.mockResolvedValue(null);

            const call = domain.updatePhotoProfile(profile.id, {
                key: aws.key,
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
            expect(userRepository.updatePhotoProfile).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised while updating', async () => {
            const error = new UserNotFoundException();
            awsS3Service.checkItem.mockRejectedValue(error);

            const call = domain.updatePhotoProfile(profile.id, {
                key: aws.key,
            });

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

            const call = domain.updatePhotoProfile(profile.id, {
                key: aws.key,
            });

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

        it('uploads the file', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(
                'photo-profile/user-persimmon/random.png'
            );
            awsS3Service.putItem.mockResolvedValue(aws);

            await domain.uploadPhotoProfile(profile.id, file);

            expect(awsS3Service.putItem).toHaveBeenCalledWith(
                {
                    key: 'photo-profile/user-persimmon/random.png',
                    size: file.size,
                    file: file.buffer,
                },
                { access: EnumAwsS3Accessibility.public }
            );
            expect(userRepository.updatePhotoProfile).toHaveBeenCalledWith(
                profile.id,
                aws
            );
        });

        it('enqueues the previous photo delete after the write when a different photo exists', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(aws);
            const calls: string[] = [];
            userRepository.findOneById.mockResolvedValue({
                ...profile,
                photo: previousPhoto,
            });
            userRepository.updatePhotoProfile.mockImplementation(async () => {
                calls.push('write');

                return profile;
            });
            userQueue.deletePhoto.mockImplementation(async () => {
                calls.push('enqueue');
            });

            await domain.uploadPhotoProfile(profile.id, file);

            expect(userQueue.deletePhoto).toHaveBeenCalledWith(
                profile.id,
                previousPhoto
            );
            expect(calls).toEqual(['write', 'enqueue']);
        });

        it('enqueues nothing when the user has no previous photo', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(aws);

            await domain.uploadPhotoProfile(profile.id, file);

            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });

        it.each([
            'photo-profile/user-other/previous.png',
            'photo-profile/user-persimmon-sibling/previous.png',
            'term-policies/privacy/1/en.pdf',
        ])(
            'enqueues nothing when the previous photo key %s sits outside the user prefix',
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

                await domain.uploadPhotoProfile(profile.id, file);

                expect(userQueue.deletePhoto).not.toHaveBeenCalled();
            }
        );

        it('enqueues nothing when the previous photo has the same key', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue({
                ...profile,
                photo: { ...previousPhoto, key: aws.key },
            });

            await domain.uploadPhotoProfile(profile.id, file);

            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });

        it('enqueues nothing and writes nothing when the user is missing', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(aws.key);
            awsS3Service.putItem.mockResolvedValue(aws);
            userRepository.findOneById.mockResolvedValue(null);

            const rejection = domain.uploadPhotoProfile(profile.id, file);

            await expect(rejection).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });
            expect(userRepository.updatePhotoProfile).not.toHaveBeenCalled();
            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 answers null', async () => {
            fileService.extractExtensionFromFilename.mockReturnValue(
                EnumFileExtensionImage.png
            );
            fileService.createRandomFilename.mockReturnValue(
                'photo-profile/user-persimmon/random.png'
            );
            awsS3Service.putItem.mockResolvedValue(null);

            const call = domain.uploadPhotoProfile(profile.id, file);

            await expect(call).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3NotConfigured
                    ],
                messagePath: 'aws.error.s3NotConfigured',
            });
            expect(userRepository.updatePhotoProfile).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised during upload', async () => {
            const error = new UserNotFoundException();
            fileService.extractExtensionFromFilename.mockImplementation(() => {
                throw error;
            });

            const call = domain.uploadPhotoProfile(profile.id, file);

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

            const call = domain.uploadPhotoProfile(profile.id, file);

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

            const call = domain.uploadPhotoProfile(profile.id, oversizedFile);

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
            expect(userRepository.updatePhotoProfile).not.toHaveBeenCalled();
            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });
    });

    describe('claimUsername', () => {
        const username: Lowercase<string> = 'persimmon';

        it('claims the username', async () => {
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);

            await domain.claimUsername(profile.id, username);

            expect(userRepository.claimUsername).toHaveBeenCalledWith(
                profile.id,
                { username }
            );
        });

        it('throws UserUsernameNotAllowedException when the pattern rejects it', async () => {
            userUtil.checkUsernamePattern.mockReturnValue(true);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);

            const call = domain.claimUsername(profile.id, 'bad name');

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
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(true);
            userRepository.existsByUsername.mockResolvedValue(false);

            const call = domain.claimUsername(profile.id, 'damn');

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
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(true);

            const call = domain.claimUsername(profile.id, username);

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
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);
            const collision = new Error('unique');
            userRepository.claimUsername.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const call = domain.claimUsername(profile.id, username);

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
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);
            const error = new UserUsernameExistException();
            userRepository.claimUsername.mockRejectedValue(error);

            const call = domain.claimUsername(profile.id, username);

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
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);
            const error = new Error('boom');
            userRepository.claimUsername.mockRejectedValue(error);

            const call = domain.claimUsername(profile.id, username);

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

    describe('deleteOwnedPhoto', () => {
        it('enqueues the delete of a photo under the profile path of the user', async () => {
            await domain.deleteOwnedPhoto(profile.id, previousPhoto);

            expect(userUtil.isPhotoProfileKeyOwned).toHaveBeenCalledWith(
                profile.id,
                previousPhoto.key
            );
            expect(userQueue.deletePhoto).toHaveBeenCalledWith(
                profile.id,
                previousPhoto
            );
        });

        it('keeps a photo outside the profile path of the user', async () => {
            await domain.deleteOwnedPhoto(profile.id, {
                ...previousPhoto,
                key: 'photo-profile/user-other/previous.png',
            });

            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });

        it('enqueues nothing for a user without a photo', async () => {
            await domain.deleteOwnedPhoto(profile.id, null);

            expect(userUtil.isPhotoProfileKeyOwned).not.toHaveBeenCalled();
            expect(userQueue.deletePhoto).not.toHaveBeenCalled();
        });
    });

    describe('deletePhotoObject', () => {
        it('deletes the photo object in the given bucket access', async () => {
            await domain.deletePhotoObject(
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

            const rejection = domain.deletePhotoObject(
                'photo-profile/user-persimmon/previous.png',
                EnumAwsS3Accessibility.public
            );

            await expect(rejection).rejects.toBe(failure);
        });
    });

    describe('createRandomFilenamePhotoProfileWithPath', () => {
        it('substitutes the userId in the configured path and delegates to the file service', () => {
            fileService.createRandomFilename.mockReturnValue(
                'photo-profile/user-persimmon/random.png'
            );

            const result = domain.createRandomFilenamePhotoProfileWithPath(
                profile.id,
                { extension: EnumFileExtensionImage.png }
            );

            expect(result).toBe('photo-profile/user-persimmon/random.png');
            expect(fileService.createRandomFilename).toHaveBeenCalledWith({
                path: `photo-profile/${profile.id}`,
                extension: EnumFileExtensionImage.png,
                randomLength: 20,
            });
        });
    });
});
