import { IFileRandomFilenameOptions } from '@common/file/interfaces/file.interface';
import { FileService } from '@common/file/services/file.service';
import { HelperService } from '@common/helper/services/helper.service';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserDto } from '@modules/user/dtos/user.dto';
import { IUser, IUserProfile } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserUtil {
    private readonly usernamePrefix: string;
    private readonly usernamePattern: RegExp;
    private readonly uploadPath: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService,
        private readonly fileService: FileService
    ) {
        this.usernamePrefix = this.configService.get<string>(
            'user.usernamePrefix'
        );
        this.usernamePattern = this.configService.get<RegExp>(
            'user.usernamePattern'
        );
        this.uploadPath = this.configService.get<string>('user.uploadPath');
    }

    createRandomFilenamePhotoWithPath(
        user: string,
        { mime }: IFileRandomFilenameOptions
    ): string {
        const path: string = this.uploadPath.replace('{user}', user);
        return this.fileService.createRandomFilename({
            prefix: path,
            mime,
            randomLength: 20,
        });
    }

    createRandomUsername(): string {
        const suffix = this.helperService.randomString(6);

        return `${this.usernamePrefix}-${suffix}`.toLowerCase();
    }

    checkUsernamePattern(username: string): boolean {
        return !!username.search(this.usernamePattern);
    }

    async checkBadWord(str: string): Promise<boolean> {
        const filterBadWordModule = await import('bad-words');
        const filterBadWord = new filterBadWordModule.Filter();
        return filterBadWord.isProfane(str);
    }

    mapList(users: IUser[]): UserListResponseDto[] {
        return plainToInstance(UserListResponseDto, users);
    }

    mapOne(user: IUser): UserDto {
        return plainToInstance(UserDto, user);
    }

    mapProfile(user: IUserProfile): UserProfileResponseDto {
        return plainToInstance(UserProfileResponseDto, user);
    }

    checkMobileNumber(phoneCode: string[], mobileNumber: string): boolean {
        return phoneCode.some(e => mobileNumber.startsWith(e));
    }
}
