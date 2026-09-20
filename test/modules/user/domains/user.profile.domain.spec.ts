import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AwsServiceUnavailableException } from '@common/aws/exceptions/aws.service-unavailable.exception';
import type {
    IAwsS3,
    IAwsS3Presign,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import type { IFile } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumUserGender } from '@generated/prisma-client';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserProfileDomain', () => {
    const userRepository = {
        findOneActiveProfileById:
            vi.fn<UserRepository['findOneActiveProfileById']>(),
        updateProfile: vi.fn<UserRepository['updateProfile']>(),
        updatePhotoProfile: vi.fn<UserRepository['updatePhotoProfile']>(),
        existsByUsername: vi.fn<UserRepository['existsByUsername']>(),
        claimUsername: vi.fn<UserRepository['claimUsername']>(),
    } satisfies Pick<
        UserRepository,
        | 'findOneActiveProfileById'
        | 'updateProfile'
        | 'updatePhotoProfile'
        | 'existsByUsername'
        | 'claimUsername'
    >;
    const countryService = {
        existsById: vi.fn<CountryDomain['existsById']>(),
    } satisfies Pick<CountryDomain, 'existsById'>;
    const userUtil = {
        checkUsernamePattern: vi.fn<UserUtil['checkUsernamePattern']>(),
        checkBadWord: vi.fn<UserUtil['checkBadWord']>(),
    } satisfies Pick<UserUtil, 'checkUsernamePattern' | 'checkBadWord'>;
    const awsS3Service = {
        presignPutItem: vi.fn<AwsS3Service['presignPutItem']>(),
        mapPresign: vi.fn<AwsS3Service['mapPresign']>(),
        putItem: vi.fn<AwsS3Service['putItem']>(),
    } satisfies Pick<AwsS3Service, 'presignPutItem' | 'mapPresign' | 'putItem'>;
    const fileService = {
        createRandomFilename: vi.fn<FileService['createRandomFilename']>(),
        extractExtensionFromFilename:
            vi.fn<FileService['extractExtensionFromFilename']>(),
    } satisfies Pick<
        FileService,
        'createRandomFilename' | 'extractExtensionFromFilename'
    >;
    const configGet = vi.fn((_key: string): unknown => undefined);
    const configService = {
        get<T>(key: string): T | undefined {
            return configGet(key) as T | undefined;
        },
    } satisfies Pick<ConfigService, 'get'>;

    const aws = {
        bucket: 'bucket',
        key: 'users/user-id/photo.png',
        cdnUrl: null,
        completedUrl: 'https://cdn.example.com/users/user-id/photo.png',
        mime: 'image/png',
        extension: 'png',
        access: EnumAwsS3Accessibility.public,
        size: 100,
    } satisfies IAwsS3;
    const presign = {
        key: aws.key,
        mime: aws.mime,
        extension: aws.extension,
        presignUrl: 'https://s3.example.com/presign',
        expiredInSeconds: 300,
    } satisfies IAwsS3Presign;

    let service: UserProfileDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            const values = {
                'user.uploadPhotoProfilePath': 'users/{userId}/photos',
            };

            return values[key as keyof typeof values];
        });
        countryService.existsById.mockResolvedValue(true);
        userUtil.checkUsernamePattern.mockReturnValue(false);
        userUtil.checkBadWord.mockResolvedValue(false);
        userRepository.existsByUsername.mockResolvedValue(false);
        fileService.createRandomFilename.mockReturnValue(aws.key);
        fileService.extractExtensionFromFilename.mockReturnValue(
            EnumFileExtensionImage.png
        );
        awsS3Service.presignPutItem.mockResolvedValue(presign);
        awsS3Service.mapPresign.mockReturnValue(aws);
        awsS3Service.putItem.mockResolvedValue(aws);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserProfileDomain,
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: ActivityLogDomain,
                    useValue: createMock<ActivityLogDomain>(),
                },
                { provide: CountryDomain, useValue: countryService },
                { provide: UserUtil, useValue: userUtil },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: FileService, useValue: fileService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = moduleRef.get(UserProfileDomain);
    });

    describe('getProfile', () => {
        it('throws UserNotFoundException when no active profile exists', async () => {
            userRepository.findOneActiveProfileById.mockResolvedValue(null);

            await expect(service.getProfile('user-id')).rejects.toBeInstanceOf(
                UserNotFoundException
            );
        });
    });

    describe('updateProfile', () => {
        it('updates profile data after validating the country', async () => {
            await service.updateProfile('user-id', {
                countryId: 'country-id',
                gender: EnumUserGender.male,
                name: 'User',
            });

            expect(countryService.existsById).toHaveBeenCalledWith(
                'country-id'
            );
            expect(userRepository.updateProfile).toHaveBeenCalledWith(
                'user-id',
                {
                    countryId: 'country-id',
                    gender: EnumUserGender.male,
                    name: 'User',
                }
            );
        });

        it('throws CountryNotFoundException when the country id is unknown', async () => {
            countryService.existsById.mockResolvedValue(false);

            await expect(
                service.updateProfile('user-id', {
                    countryId: 'missing-country-id',
                    gender: EnumUserGender.male,
                })
            ).rejects.toBeInstanceOf(CountryNotFoundException);
            expect(userRepository.updateProfile).not.toHaveBeenCalled();
        });
    });

    describe('generatePhotoProfilePresign', () => {
        it('creates a user-scoped filename and returns the S3 presign', async () => {
            await expect(
                service.generatePhotoProfilePresign('user-id', {
                    extension: EnumFileExtensionImage.png,
                    size: 100,
                })
            ).resolves.toEqual(presign);

            expect(fileService.createRandomFilename).toHaveBeenCalledWith({
                path: 'users/user-id/photos',
                extension: EnumFileExtensionImage.png,
                randomLength: 20,
            });
            expect(awsS3Service.presignPutItem).toHaveBeenCalledWith(
                {
                    key: aws.key,
                    size: 100,
                },
                {
                    forceUpdate: true,
                    access: EnumAwsS3Accessibility.public,
                }
            );
        });

        it('throws AwsServiceUnavailableException when S3 cannot create a presign', async () => {
            awsS3Service.presignPutItem.mockResolvedValue(null);

            await expect(
                service.generatePhotoProfilePresign('user-id', {
                    extension: EnumFileExtensionImage.png,
                    size: 100,
                })
            ).rejects.toBeInstanceOf(AwsServiceUnavailableException);
        });
    });

    describe('updatePhotoProfile', () => {
        it('maps the presigned object and stores it on the user profile', async () => {
            await service.updatePhotoProfile('user-id', {
                key: aws.key,
                size: 100,
            });

            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                { key: aws.key, size: 100 },
                { access: EnumAwsS3Accessibility.public }
            );
            expect(userRepository.updatePhotoProfile).toHaveBeenCalledWith(
                'user-id',
                aws
            );
        });
    });

    describe('uploadPhotoProfile', () => {
        it('uploads a local file to S3 and stores the resulting object when upload succeeds', async () => {
            const file = {
                originalname: 'avatar.png',
                size: 100,
                buffer: Buffer.from('image'),
            } as IFile;

            await service.uploadPhotoProfile('user-id', file);

            expect(
                fileService.extractExtensionFromFilename
            ).toHaveBeenCalledWith('avatar.png');
            expect(awsS3Service.putItem).toHaveBeenCalledWith(
                { key: aws.key, size: 100, file: file.buffer },
                { access: EnumAwsS3Accessibility.public }
            );
            expect(userRepository.updatePhotoProfile).toHaveBeenCalledWith(
                'user-id',
                aws
            );
        });

        it('does not update the profile when S3 returns no uploaded object', async () => {
            awsS3Service.putItem.mockResolvedValue(null);
            const file = {
                originalname: 'avatar.png',
                size: 100,
                buffer: Buffer.from('image'),
            } as IFile;

            await service.uploadPhotoProfile('user-id', file);

            expect(userRepository.updatePhotoProfile).not.toHaveBeenCalled();
        });
    });

    describe('claimUsername', () => {
        it('claims an available username', async () => {
            await service.claimUsername('user-id', 'newname');

            expect(userRepository.claimUsername).toHaveBeenCalledWith(
                'user-id',
                { username: 'newname' }
            );
        });

        it('throws UserUsernameNotAllowedException before checking other username failures', async () => {
            userUtil.checkUsernamePattern.mockReturnValue(true);
            userUtil.checkBadWord.mockResolvedValue(true);
            userRepository.existsByUsername.mockResolvedValue(true);

            await expect(
                service.claimUsername('user-id', 'bad')
            ).rejects.toBeInstanceOf(UserUsernameNotAllowedException);
            expect(userRepository.claimUsername).not.toHaveBeenCalled();
        });

        it('throws UserUsernameContainBadWordException when the username contains a bad word', async () => {
            userUtil.checkBadWord.mockResolvedValue(true);

            await expect(
                service.claimUsername('user-id', 'badword')
            ).rejects.toBeInstanceOf(UserUsernameContainBadWordException);
        });

        it('throws UserUsernameExistException when the username already exists', async () => {
            userRepository.existsByUsername.mockResolvedValue(true);

            await expect(
                service.claimUsername('user-id', 'taken')
            ).rejects.toBeInstanceOf(UserUsernameExistException);
        });
    });
});
