import { AwsS3PresignResponseDto } from '@common/aws/dtos/response/aws.s3-presign.response.dto';
import { IFile } from '@common/file/interfaces/file.interface';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import {
    UserUpdateProfilePhotoRequestDto,
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';

export interface IUserProfileHttpService {
    getProfile(
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>>;
    updateProfile(
        userId: string,
        { countryId, ...data }: UserUpdateProfileRequestDto
    ): Promise<void>;
    generatePhotoProfilePresign(
        userId: string,
        { extension, size }: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<AwsS3PresignResponseDto>>;
    updatePhotoProfile(
        userId: string,
        { photoKey, size }: UserUpdateProfilePhotoRequestDto
    ): Promise<void>;
    uploadPhotoProfile(userId: string, file: IFile): Promise<void>;
    claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto
    ): Promise<void>;
}
