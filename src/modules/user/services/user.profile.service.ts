import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsServiceUnavailableException } from '@common/aws/exceptions/aws.service-unavailable.exception';
import { IAwsS3, IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import {
    IFile,
    IFileRandomFilenameOptions,
} from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryService } from '@modules/country/services/country.service';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import {
    IUserGeneratePhotoProfile,
    IUserProfile,
    IUserUpdatePhotoProfile,
    IUserUpdateProfile,
} from '@modules/user/interfaces/user.interface';
import { IUserProfileService } from '@modules/user/interfaces/user.profile.service.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserProfileService implements IUserProfileService {
    private readonly logger = new Logger(UserProfileService.name);

    private readonly uploadPhotoProfilePath: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly countryService: CountryService,
        private readonly userUtil: UserUtil,
        private readonly awsS3Service: AwsS3Service,
        private readonly fileService: FileService,
        private readonly requestStoreService: RequestStoreService,
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
            user
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
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const checkCountry = await this.countryService.existById(countryId);
        if (!checkCountry) {
            throw new CountryNotFoundException();
        }

        try {
            await this.userRepository.updateProfile(
                userId,
                {
                    countryId,
                    ...data,
                },
                requestLog
            );

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
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        try {
            const aws: IAwsS3 = this.awsS3Service.mapPresign({
                key,
                size,
            });

            await this.userRepository.updatePhotoProfile(
                userId,
                aws,
                requestLog
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async uploadPhotoProfile(userId: string, file: IFile): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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

            const aws: IAwsS3 | null = await this.awsS3Service.putItem({
                key,
                size: file.size,
                file: file.buffer,
            });

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

                await this.userRepository.updatePhotoProfile(
                    userId,
                    aws,
                    requestLog
                );
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
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const [checkUsername, checkBadWord, exist] = await Promise.all([
            this.userUtil.checkUsernamePattern(username),
            this.userUtil.checkBadWord(username),
            this.userRepository.existByUsername(username),
        ]);
        if (checkUsername) {
            throw new UserUsernameNotAllowedException();
        } else if (checkBadWord) {
            throw new UserUsernameContainBadWordException();
        } else if (exist) {
            throw new UserUsernameExistException();
        }

        try {
            await this.userRepository.claimUsername(
                userId,
                { username },
                requestLog
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
