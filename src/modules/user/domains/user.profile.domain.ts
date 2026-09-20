import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsServiceUnavailableException } from '@common/aws/exceptions/aws.service-unavailable.exception';
import type {
    IAwsS3,
    IAwsS3Presign,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import type {
    IFile,
    IFileRandomFilenameOptions,
} from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import type {
    IUserGeneratePhotoProfile,
    IUserProfile,
    IUserUpdatePhotoProfile,
    IUserUpdateProfile,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserProfileDomain {
    private readonly logger = new Logger(UserProfileDomain.name);

    private readonly uploadPhotoProfilePath: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly countryDomain: CountryDomain,
        private readonly userUtil: UserUtil,
        private readonly awsS3Service: AwsS3Service,
        private readonly fileService: FileService,
        private readonly configService: ConfigService
    ) {
        this.uploadPhotoProfilePath = this.configService.get<string>(
            'user.uploadPhotoProfilePath'
        )!;
    }

    createRandomFilenamePhotoProfileWithPath(
        user: string,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path: string = this.uploadPhotoProfilePath.replace(
            '{userId}',
            () => user
        );
        return this.fileService.createRandomFilename({
            path,
            extension,
            randomLength: 20,
        });
    }

    async getProfile(userId: string): Promise<IUserProfile> {
        const user = await this.userRepository.findOneActiveProfileById(userId);
        if (!user) {
            throw new UserNotFoundException();
        }

        return user;
    }

    async updateProfile(
        userId: string,
        { countryId, ...data }: IUserUpdateProfile
    ): Promise<void> {
        const checkCountry = await this.countryDomain.existsById(countryId);
        if (!checkCountry) {
            throw new CountryNotFoundException();
        }

        try {
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userUpdateProfile,
                }),
            ];
            await this.userRepository.updateProfile(userId, {
                countryId,
                ...data,
            });

            this.activityLogDomain.stagePrepared(events);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async generatePhotoProfilePresign(
        userId: string,
        { extension, size }: IUserGeneratePhotoProfile
    ): Promise<IAwsS3Presign> {
        const key: string = this.createRandomFilenamePhotoProfileWithPath(
            userId,
            {
                extension,
            }
        );

        const aws: IAwsS3Presign | null =
            await this.awsS3Service.presignPutItem(
                {
                    key,
                    size,
                },
                {
                    forceUpdate: true,
                    access: EnumAwsS3Accessibility.public,
                }
            );

        if (!aws) {
            throw new AwsServiceUnavailableException();
        }

        return aws;
    }

    async updatePhotoProfile(
        userId: string,
        { key, size }: IUserUpdatePhotoProfile
    ): Promise<void> {
        try {
            const aws: IAwsS3 = this.awsS3Service.mapPresign(
                {
                    key,
                    size,
                },
                { access: EnumAwsS3Accessibility.public }
            );

            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userUpdatePhotoProfile,
                }),
            ];
            await this.userRepository.updatePhotoProfile(userId, aws);

            this.activityLogDomain.stagePrepared(events);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async uploadPhotoProfile(userId: string, file: IFile): Promise<void> {
        try {
            const extension: EnumFileExtensionImage =
                this.fileService.extractExtensionFromFilename(
                    file.originalname
                ) as EnumFileExtensionImage;

            const key: string = this.createRandomFilenamePhotoProfileWithPath(
                userId,
                {
                    extension,
                }
            );

            const aws: IAwsS3 | null = await this.awsS3Service.putItem(
                {
                    key,
                    size: file.size,
                    file: file.buffer,
                },
                { access: EnumAwsS3Accessibility.public }
            );

            if (aws) {
                this.logger.debug(
                    {
                        userId,
                        fileSize: file.size,
                        awsKey: aws.key,
                        awsBucket: aws.bucket,
                    },
                    `Photo profile uploaded to S3 with key: ${key}`
                );

                const events = [
                    this.activityLogDomain.prepare({
                        action: EnumActivityLogAction.userUpdatePhotoProfile,
                    }),
                ];
                await this.userRepository.updatePhotoProfile(userId, aws);

                this.activityLogDomain.stagePrepared(events);
            }

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async claimUsername(
        userId: string,
        username: Lowercase<string>
    ): Promise<void> {
        const [checkUsername, checkBadWord, exist] = await Promise.all([
            this.userUtil.checkUsernamePattern(username),
            this.userUtil.checkBadWord(username),
            this.userRepository.existsByUsername(username),
        ]);
        if (checkUsername) {
            throw new UserUsernameNotAllowedException();
        } else if (checkBadWord) {
            throw new UserUsernameContainBadWordException();
        } else if (exist) {
            throw new UserUsernameExistException();
        }

        try {
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userClaimUsername,
                }),
            ];
            await this.userRepository.claimUsername(userId, { username });

            this.activityLogDomain.stagePrepared(events);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
