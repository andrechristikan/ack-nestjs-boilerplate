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

export interface IUserProfileHttpService {
    getProfile(userId: string): Promise<IResponseReturn<IUserProfile>>;
    updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto
    ): Promise<void>;
    generatePhotoProfilePresign(
        userId: string,
        { extension, size }: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<IAwsS3Presign>>;
    updatePhotoProfile(
        userId: string,
        { key, size }: UserUpdateProfilePhotoRequestDto
    ): Promise<void>;
    uploadPhotoProfile(userId: string, file: IFile): Promise<void>;
    claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<void>;
}
