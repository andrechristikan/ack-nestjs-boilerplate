import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
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
import type { UserPhoto } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPhotoKeyInvalidException } from '@modules/user/exceptions/user.photo-key-invalid.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import type {
    IUserGeneratePhotoProfile,
    IUserProfile,
    IUserUpdatePhotoProfile,
    IUserUpdateProfile,
} from '@modules/user/interfaces/user.interface';
import { UserQueue } from '@modules/user/queues/user.queue';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserProfileDomain {
    private readonly logger = new Logger(UserProfileDomain.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly countryDomain: CountryDomain,
        private readonly userUtil: UserUtil,
        private readonly awsS3Service: AwsS3Service,
        private readonly fileService: FileService,
        private readonly userQueue: UserQueue
    ) {}

    private async deletePreviousPhoto(
        userId: string,
        previousPhoto: UserPhoto | null,
        currentKey: string
    ): Promise<void> {
        if (previousPhoto === null || previousPhoto.key === currentKey) {
            return;
        }

        const isOwned = this.userUtil.isPhotoProfileKeyOwned(
            userId,
            previousPhoto.key
        );
        if (!isOwned) {
            return;
        }

        await this.userQueue.deletePhoto(userId, previousPhoto);
    }

    createRandomFilenamePhotoProfileWithPath(
        user: string,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path = this.userUtil.buildPhotoProfilePath(user);

        return this.fileService.createRandomFilename({
            path,
            extension,
            randomLength: 20,
        });
    }

    async deletePhotoObject(
        key: string,
        access: EnumAwsS3Accessibility
    ): Promise<void> {
        await this.awsS3Service.deleteItem(key, { access });
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
        // Sequential by design: gate before the work it guards
        const checkCountry = await this.countryDomain.existsById(countryId);
        if (!checkCountry) {
            throw new CountryNotFoundException();
        }

        try {
            const activityLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userUpdateProfile,
                }),
            ];
            await this.userRepository.updateProfile(userId, {
                countryId,
                ...data,
            });

            this.activityLogDomain.stagePrepared(activityLogs);

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
            throw new AwsS3NotConfiguredException();
        }

        return aws;
    }

    async updatePhotoProfile(
        userId: string,
        { key, size }: IUserUpdatePhotoProfile
    ): Promise<void> {
        const isS3Initialized = this.awsS3Service.isInitialized();
        if (!isS3Initialized) {
            throw new AwsS3NotConfiguredException();
        }

        const isOwned = this.userUtil.isPhotoProfileKeyOwned(userId, key);
        if (!isOwned) {
            throw new UserPhotoKeyInvalidException();
        }

        try {
            const aws: IAwsS3 = this.awsS3Service.mapPresign(
                {
                    key,
                    size,
                },
                { access: EnumAwsS3Accessibility.public }
            );

            // Sequential by design: gate before the work it guards
            const user = await this.userRepository.findOneById(userId);
            if (!user) {
                throw new UserNotFoundException();
            }

            const activityLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userUpdatePhotoProfile,
                }),
            ];
            await this.userRepository.updatePhotoProfile(userId, aws);

            await this.deletePreviousPhoto(userId, user.photo, aws.key);
            this.activityLogDomain.stagePrepared(activityLogs);

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

            const [user, aws] = await Promise.all([
                this.userRepository.findOneById(userId),
                this.awsS3Service.putItem(
                    {
                        key,
                        size: file.size,
                        file: file.buffer,
                    },
                    { access: EnumAwsS3Accessibility.public }
                ),
            ]);
            if (!user) {
                throw new UserNotFoundException();
            }
            if (!aws) {
                throw new AwsS3NotConfiguredException();
            }

            this.logger.debug(
                {
                    userId,
                    fileSize: file.size,
                    awsKey: aws.key,
                    awsBucket: aws.bucket,
                },
                `Photo profile uploaded to S3 with key: ${key}`
            );

            const activityLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userUpdatePhotoProfile,
                }),
            ];
            await this.userRepository.updatePhotoProfile(userId, aws);

            await this.deletePreviousPhoto(userId, user.photo, aws.key);
            this.activityLogDomain.stagePrepared(activityLogs);

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
        // Sequential by design: gate before the work it guards
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
            const activityLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userClaimUsername,
                }),
            ];
            await this.userRepository.claimUsername(userId, { username });

            this.activityLogDomain.stagePrepared(activityLogs);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
