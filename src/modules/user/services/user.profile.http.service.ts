import { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { IFile } from '@common/file/interfaces/file.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserUpdateProfilePhotoRequestDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { IUserProfileHttpService } from '@modules/user/interfaces/user.profile.http.service.interface';
import { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserProfileHttpService implements IUserProfileHttpService {
    constructor(private readonly userProfileService: UserProfileService) {}

    async getProfile(userId: string): Promise<IResponseReturn<IUserProfile>> {
        const user = await this.userProfileService.getProfile(userId);

        return { data: user };
    }

    async updateProfile(
        userId: string,
        { countryId, gender, name }: UserUpdateProfileRequestDto
    ): Promise<void> {
        await this.userProfileService.updateProfile(userId, {
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
            await this.userProfileService.generatePhotoProfilePresign(userId, {
                extension,
                size,
            });

        return { data: presign };
    }

    async updatePhotoProfile(
        userId: string,
        { photoKey, size }: UserUpdateProfilePhotoRequestDto
    ): Promise<void> {
        await this.userProfileService.updatePhotoProfile(userId, {
            photoKey,
            size,
        });
    }

    async uploadPhotoProfile(userId: string, file: IFile): Promise<void> {
        await this.userProfileService.uploadPhotoProfile(userId, file);
    }

    async claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<void> {
        await this.userProfileService.claimUsername(userId, username);
    }
}
