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
import type { Country, TwoFactor } from '@generated/prisma-client/client';
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
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';

describe('UserProfileDomain', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: UserProfileDomain;

    const event: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.userUpdateProfile,
        metadata: {},
        onError: false,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
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

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(() => 'photo-profile/{userId}');
        activityLogDomain.prepare.mockReturnValue(event);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProfileDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: UserUtil, useValue: userUtil },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: FileService, useValue: fileService },
                { provide: ConfigService, useValue: configService },
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
        it('updates the profile and stages the activity log event', async () => {
            countryDomain.existsById.mockResolvedValue(true);

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
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('throws CountryNotFoundException when the country does not exist', async () => {
            countryDomain.existsById.mockResolvedValue(false);

            const call = domain.updateProfile(profile.id, {
                countryId: 'missing',
                name: null,
                gender: EnumUserGender.male,
            });

            await expect(call).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                statusCodeKey:
                    EnumCountryStatusCodeError[
                        EnumCountryStatusCodeError.notFound
                    ],
                messagePath: 'country.error.notFound',
            });
        });

        it('rethrows an AppBaseException raised while updating', async () => {
            countryDomain.existsById.mockResolvedValue(true);
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
            countryDomain.existsById.mockResolvedValue(true);
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

        it('maps the presign and stages the activity log event', async () => {
            awsS3Service.isInitialized.mockReturnValue(true);
            awsS3Service.mapPresign.mockReturnValue(aws);

            await domain.updatePhotoProfile(profile.id, {
                key: aws.key,
                size: aws.size,
            });

            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                { key: aws.key, size: aws.size },
                { access: EnumAwsS3Accessibility.public }
            );
            expect(userRepository.updatePhotoProfile).toHaveBeenCalledWith(
                profile.id,
                aws
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            awsS3Service.isInitialized.mockReturnValue(false);

            const call = domain.updatePhotoProfile(profile.id, {
                key: aws.key,
                size: aws.size,
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
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(userRepository.updatePhotoProfile).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised while updating', async () => {
            const error = new UserNotFoundException();
            awsS3Service.isInitialized.mockReturnValue(true);
            awsS3Service.mapPresign.mockImplementation(() => {
                throw error;
            });

            const call = domain.updatePhotoProfile(profile.id, {
                key: aws.key,
                size: aws.size,
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
            awsS3Service.isInitialized.mockReturnValue(true);
            awsS3Service.mapPresign.mockImplementation(() => {
                throw error;
            });

            const call = domain.updatePhotoProfile(profile.id, {
                key: aws.key,
                size: aws.size,
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

        it('uploads the file and stages the activity log event', async () => {
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
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
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
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
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
    });

    describe('claimUsername', () => {
        const username: Lowercase<string> = 'persimmon';

        it('claims the username and stages the activity log event', async () => {
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);

            await domain.claimUsername(profile.id, username);

            expect(userRepository.claimUsername).toHaveBeenCalledWith(
                profile.id,
                { username }
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
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
