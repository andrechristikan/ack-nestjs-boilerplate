import { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import {
    IFile,
    IFileRandomFilenameOptions,
} from '@common/file/interfaces/file.interface';
import {
    IUserGeneratePhotoProfile,
    IUserProfile,
    IUserUpdatePhotoProfile,
    IUserUpdateProfile,
} from '@modules/user/interfaces/user.interface';

export interface IUserProfileService {
    createRandomFilenamePhotoProfileWithPath(
        user: string,
        { extension }: IFileRandomFilenameOptions
    ): string;
    getProfile(userId: string): Promise<IUserProfile>;
    updateProfile(
        userId: string,
        { countryId, ...data }: IUserUpdateProfile
    ): Promise<void>;
    generatePhotoProfilePresign(
        userId: string,
        { extension, size }: IUserGeneratePhotoProfile
    ): Promise<IAwsS3Presign>;
    updatePhotoProfile(
        userId: string,
        { key, size }: IUserUpdatePhotoProfile
    ): Promise<void>;
    uploadPhotoProfile(userId: string, file: IFile): Promise<void>;
    claimUsername(userId: string, username: Lowercase<string>): Promise<void>;
}
