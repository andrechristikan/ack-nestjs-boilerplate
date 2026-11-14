import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { NotFound } from '@aws-sdk/client-s3';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import type { UserPhoto } from '@generated/prisma-client/client';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPhotoKeyInvalidException } from '@modules/user/exceptions/user.photo-key-invalid.exception';
import { UserPhotoSizeExceededException } from '@modules/user/exceptions/user.photo-size-exceeded.exception';
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
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserProfileService {
    private readonly logger = new Logger(UserProfileService.name);
    private readonly photoFilenameRandomLength: number;
    private readonly uploadPhotoProfilePath: string;
    private readonly photoMaxSizeInBytes: number;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly userUtil: UserUtil,
        private readonly awsS3Service: AwsS3Service,
        private readonly fileService: FileService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
        private readonly configService: ConfigService
    ) {
        this.photoFilenameRandomLength = this.configService.get<number>(
            'user.photo.filenameRandomLength'
        )!;
        this.uploadPhotoProfilePath = this.configService.get<string>(
            'user.uploadPhotoProfilePath'
        )!;
        this.photoMaxSizeInBytes = this.configService.get<number>(
            'user.photo.maxSizeInBytes'
        )!;
    }

    private buildPhotoProfilePath(userId: string): string {
        return this.uploadPhotoProfilePath.replace('{userId}', () => userId);
    }

    private isPhotoProfileKeyOwned(userId: string, key: string): boolean {
        const photoPath = this.buildPhotoProfilePath(userId);

        return key.startsWith(`${photoPath}/`);
    }

    private isPhotoSizeAllowed(size: number): boolean {
        return size <= this.photoMaxSizeInBytes;
    }

    private deletePhotoEffect(userId: string, photo: UserPhoto): IOutboxEffect {
        return {
            queue: EnumUserQueue.user,
            name: EnumUserProcess.deletePhoto,
            data: { userId, key: photo.key, access: photo.access },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };
    }

    private async deletePreviousPhotoInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        previousPhoto: UserPhoto | null,
        currentKey: string
    ): Promise<void> {
        if (previousPhoto === null || previousPhoto.key === currentKey) {
            return;
        }

        await this.deleteOwnedPhotoInTx(tx, userId, previousPhoto);
    }

    private async replacePhotoProfile(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        previousPhoto: UserPhoto | null,
        photo: IAwsS3
    ): Promise<void> {
        const userId = authContext.userId;
        await this.outboxService.withTransaction(async tx => {
            await this.userRepository.updatePhotoProfileInTx(tx, userId, photo);
            await this.deletePreviousPhotoInTx(
                tx,
                userId,
                previousPhoto,
                photo.key
            );
            const entry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userUpdatePhotoProfile,
                }
            );
            await this.outboxService.addInTx(tx, entry);
        });
    }

    /** Adds the photo delete row on the caller's transaction; adds nothing when the photo is null or not under the profile path of the user. */
    async deleteOwnedPhotoInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        photo: UserPhoto | null
    ): Promise<void> {
        if (photo === null) {
            return;
        }

        const isOwned = this.isPhotoProfileKeyOwned(userId, photo.key);
        if (!isOwned) {
            return;
        }

        const effect = this.deletePhotoEffect(userId, photo);
        await this.outboxService.addInTx(tx, effect);
    }

    createRandomFilenamePhotoProfileWithPath(
        user: string,
        { extension }: IFileRandomFilenameOptions
    ): string {
        const path = this.buildPhotoProfilePath(user);

        return this.fileService.createRandomFilename({
            path,
            extension,
            randomLength: this.photoFilenameRandomLength,
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

    async updateProfileInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { countryId, ...data }: IUserUpdateProfile
    ): Promise<void> {
        await this.userRepository.updateProfileInTx(tx, userId, {
            countryId,
            ...data,
        });
    }

    async generatePhotoProfilePresign(
        userId: string,
        { extension, size }: IUserGeneratePhotoProfile
    ): Promise<IAwsS3Presign> {
        const isSizeAllowed = this.isPhotoSizeAllowed(size);
        if (!isSizeAllowed) {
            throw new UserPhotoSizeExceededException();
        }

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
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { key }: IUserUpdatePhotoProfile
    ): Promise<void> {
        const userId = authContext.userId;
        const isOwned = this.isPhotoProfileKeyOwned(userId, key);
        if (!isOwned) {
            throw new UserPhotoKeyInvalidException();
        }

        try {
            // Sequential by design: gate before the work it guards
            const aws: IAwsS3 | null = await this.awsS3Service.checkItem(key, {
                access: EnumAwsS3Accessibility.public,
            });
            if (!aws) {
                throw new AwsS3NotConfiguredException();
            }

            const isSizeAllowed = this.isPhotoSizeAllowed(aws.size);
            if (!isSizeAllowed) {
                throw new UserPhotoSizeExceededException();
            }

            const user = await this.userRepository.findOneById(userId);
            if (!user) {
                throw new UserNotFoundException();
            }

            await this.replacePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                user.photo,
                aws
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            } else if (err instanceof NotFound) {
                throw new UserPhotoKeyInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }

    async uploadPhotoProfile(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        file: IFile
    ): Promise<void> {
        const userId = authContext.userId;
        const isSizeAllowed = this.isPhotoSizeAllowed(file.size);
        if (!isSizeAllowed) {
            throw new UserPhotoSizeExceededException();
        }

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

            await this.replacePhotoProfile(
                requestContext,
                apiKeyContext,
                authContext,
                user.photo,
                aws
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async claimUsername(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
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
            await this.outboxService.withTransaction(async tx => {
                await this.userRepository.claimUsernameInTx(
                    tx,
                    authContext.userId,
                    {
                        username,
                    }
                );
                const entry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.userClaimUsername,
                    }
                );
                await this.outboxService.addInTx(tx, entry);
            });

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isUsernameCollision = this.databaseUtil.isUniqueCollision(
                err,
                'username'
            );
            if (isUsernameCollision) {
                throw new UserUsernameExistException();
            }

            throw new AppUnknownException(err);
        }
    }
}
