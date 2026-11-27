import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { NotFound } from '@aws-sdk/client-s3';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import type {
    IAwsS3,
    IAwsS3Presign,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { FileSniffSizeInBytes } from '@common/file/constants/file.constant';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import type {
    IFile,
    IFileRandomFilenameOptions,
} from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import type { UserPhoto } from '@generated/prisma-client/client';
import { UserPhotoContentInvalidException } from '@modules/user/exceptions/user.photo-content-invalid.exception';
import { UserPhotoKeyInvalidException } from '@modules/user/exceptions/user.photo-key-invalid.exception';
import { UserPhotoSizeExceededException } from '@modules/user/exceptions/user.photo-size-exceeded.exception';
import type {
    IUserGeneratePhotoProfile,
    IUserPhotoProfileCheck,
    IUserUpdatePhotoProfile,
    IUserUpdateProfile,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { FileExtensionInvalidException } from '@common/file/exceptions/file.extension-invalid.exception';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserQueue } from '@modules/user/queues/user.queue';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserProfileService {
    private readonly logger = new Logger(UserProfileService.name);
    private readonly filenameRandomLength: number;
    private readonly uploadPhotoProfilePathPattern: string;
    private readonly maxSizeInBytes: number;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly awsS3Service: AwsS3Service,
        private readonly fileService: FileService,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly userQueue: UserQueue,
        private readonly configService: ConfigService
    ) {
        this.filenameRandomLength = this.configService.get<number>(
            'user.photo.filenameRandomLength'
        )!;
        this.uploadPhotoProfilePathPattern = this.configService.get<string>(
            'user.uploadPhotoProfilePathPattern'
        )!;
        this.maxSizeInBytes = this.configService.get<number>(
            'user.photo.maxSizeInBytes'
        )!;
    }

    private buildPhotoProfilePath(userId: string): string {
        return this.uploadPhotoProfilePathPattern.replace(
            '{userId}',
            () => userId
        );
    }

    private isPhotoProfileKeyOwned(userId: string, key: string): boolean {
        const photoPath = this.buildPhotoProfilePath(userId);

        return key.startsWith(`${photoPath}/`);
    }

    private isPhotoSizeAllowed(size: number): boolean {
        return size <= this.maxSizeInBytes;
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

        const effect = this.userQueue.deletePhotoEffect(userId, photo);
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
            randomLength: this.filenameRandomLength,
        });
    }

    async deletePhotoObject(
        key: string,
        access: EnumAwsS3Accessibility
    ): Promise<void> {
        await this.awsS3Service.deleteItem(key, { access });
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

    /** Reads the uploaded object and returns the size and content verdicts; throws `UserPhotoKeyInvalidException` for a key outside the user's photo path or a missing object, and `AwsS3NotConfiguredException` while S3 is unset; writes nothing. */
    async checkPhotoProfile(
        authContext: IAuthJwtAccessContext,
        { key }: IUserUpdatePhotoProfile
    ): Promise<IUserPhotoProfileCheck> {
        const userId = authContext.userId;
        const isOwned = this.isPhotoProfileKeyOwned(userId, key);
        if (!isOwned) {
            throw new UserPhotoKeyInvalidException();
        }

        try {
            const [aws, head]: [IAwsS3 | null, Buffer | null] =
                await Promise.all([
                    this.awsS3Service.checkItem(key, {
                        access: EnumAwsS3Accessibility.public,
                    }),
                    this.awsS3Service.getItemBytes(key, FileSniffSizeInBytes, {
                        access: EnumAwsS3Accessibility.public,
                    }),
                ]);
            if (!aws) {
                throw new AwsS3NotConfiguredException();
            }

            if (!head) {
                throw new AwsS3NotConfiguredException();
            }

            const isSizeAllowed = this.isPhotoSizeAllowed(aws.size);
            const isContentValid = await this.fileService.isContentOfExtension(
                head,
                aws.extension
            );

            return { isSizeAllowed, isContentValid, photo: aws };
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            } else if (err instanceof NotFound) {
                throw new UserPhotoKeyInvalidException();
            }

            throw new AppUnknownException(err);
        }
    }

    isPhotoProfileRejected({
        isSizeAllowed,
        isContentValid,
    }: IUserPhotoProfileCheck): boolean {
        return !isSizeAllowed || !isContentValid;
    }

    assertPhotoSizeAllowed({ isSizeAllowed }: IUserPhotoProfileCheck): void {
        if (!isSizeAllowed) {
            throw new UserPhotoSizeExceededException();
        }
    }

    assertPhotoContentValid({ isContentValid }: IUserPhotoProfileCheck): void {
        if (!isContentValid) {
            throw new UserPhotoContentInvalidException();
        }
    }

    /** Adds the delete row of an uploaded photo whose size or content was rejected on the caller's transaction. */
    async deleteRejectedPhotoInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        photo: IAwsS3
    ): Promise<void> {
        const effect = this.userQueue.deletePhotoEffect(userId, photo);
        await this.outboxService.addInTx(tx, effect);
    }

    /** Stores the photo, adds the delete row of a different previous photo under the profile path, and adds the entry on the caller's transaction. */
    async replacePhotoProfileInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        previousPhoto: UserPhoto | null,
        photo: IAwsS3
    ): Promise<void> {
        const userId = authContext.userId;
        await Promise.all([
            this.userRepository.updatePhotoProfileInTx(tx, userId, photo),
            this.deletePreviousPhotoInTx(tx, userId, previousPhoto, photo.key),
        ]);
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userPhotoProfileUpdated,
            }
        );
        await this.outboxService.addInTx(tx, entry);
    }

    /** Checks the size and the extension and puts the file to S3. */
    async prepareUploadPhotoProfile(
        authContext: IAuthJwtAccessContext,
        file: IFile
    ): Promise<IAwsS3> {
        const userId = authContext.userId;
        const isSizeAllowed = this.isPhotoSizeAllowed(file.size);
        if (!isSizeAllowed) {
            throw new UserPhotoSizeExceededException();
        }

        try {
            const rawExtension = this.fileService.extractExtensionFromFilename(
                file.originalname
            );
            const extension =
                Object.values(EnumFileExtensionImage).find(
                    value => value === rawExtension
                ) ?? null;
            if (extension === null) {
                throw new FileExtensionInvalidException();
            }

            const key: string = this.createRandomFilenamePhotoProfileWithPath(
                userId,
                {
                    extension,
                }
            );

            const aws = await this.awsS3Service.putItem(
                {
                    key,
                    size: file.size,
                    file: file.buffer,
                },
                { access: EnumAwsS3Accessibility.public }
            );
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
                'Photo profile uploaded to S3'
            );

            return aws;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async claimUsernameInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        username: Lowercase<string>
    ): Promise<void> {
        await this.userRepository.claimUsernameInTx(tx, authContext.userId, {
            username,
        });
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userUsernameClaimed,
            }
        );
        await this.outboxService.addInTx(tx, entry);
    }
}
