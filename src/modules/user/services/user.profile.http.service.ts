import { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { IFile } from '@common/file/interfaces/file.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserUpdateProfilePhotoRequestDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserProfileHttpService {
    constructor(private readonly userProfileDomain: UserProfileDomain) {}

    async getProfile(userId: string): Promise<IResponseReturn<IUserProfile>> {
        const user = await this.userProfileDomain.getProfile(userId);

        return { data: user };
    }

    async updateProfile(
        userId: string,
        { countryId, gender, name }: UserUpdateProfileRequestDto
    ): Promise<void> {
        await this.userProfileDomain.updateProfile(userId, {
            countryId,
            gender,
            name,
        });
    }

    async generatePhotoProfilePresign(
        userId: string,
        { extension, size }: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        const presign =
            await this.userProfileDomain.generatePhotoProfilePresign(userId, {
                extension,
                size,
            });

        return { data: presign };
    }

    async updatePhotoProfile(
        userId: string,
        { key, size }: UserUpdateProfilePhotoRequestDto
    ): Promise<void> {
        await this.userProfileDomain.updatePhotoProfile(userId, {
            key,
            size,
        });
    }

    async uploadPhotoProfile(userId: string, file: IFile): Promise<void> {
        await this.userProfileDomain.uploadPhotoProfile(userId, file);
    }

    async claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<void> {
        await this.userProfileDomain.claimUsername(userId, username);
    }
}
