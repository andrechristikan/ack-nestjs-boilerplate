import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumActivityLogAction,
} from '@generated/prisma-client/client';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import type { IFile } from '@common/file/interfaces/file.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { UserProfileHttpService } from '@modules/user/services/http/user.profile.http.service';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import type { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import type { UserUpdateProfilePhotoRequestDto } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';
import type { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';

describe('UserProfileHttpService', () => {
    const userProfileDomain: MockProxy<UserProfileDomain> =
        mock<UserProfileDomain>();

    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();

    let service: UserProfileHttpService;

    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userUpdateProfile,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    const profile: IUserProfile = {
        id: 'user-sable',
        name: 'Sable Grove',
        username: 'sableGrove',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'sable@example.com',
        roleId: 'role-sable',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.female,
        countryId: 'country-sable',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-sable',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
        mobileNumbers: [],
        country: {
            id: 'country-sable',
            name: 'Sable Coast',
            alpha2Code: 'SB',
            alpha3Code: 'SBL',
            phoneCode: ['+1'],
            continent: 'Atlantis',
            timezone: 'UTC',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
        },
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogDomain.prepare.mockReturnValue(activityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProfileHttpService,
                { provide: UserProfileDomain, useValue: userProfileDomain },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
            ],
        }).compile();
        service = module.get(UserProfileHttpService);
    });

    describe('getProfile', () => {
        it('wraps the profile in a response envelope', async () => {
            userProfileDomain.getProfile.mockResolvedValue(profile);

            await expect(service.getProfile('user-sable')).resolves.toEqual({
                data: profile,
            });
        });
    });

    describe('updateProfile', () => {
        it('delegates the update to the domain', async () => {
            const dto: UserUpdateProfileRequestDto = {
                name: 'Sable Grove Jr.',
                countryId: 'country-sable',
                gender: EnumUserGender.male,
            };

            await service.updateProfile('user-sable', dto);

            expect(countryDomain.getOne).toHaveBeenCalledWith(dto.countryId);
            expect(userProfileDomain.updateProfile).toHaveBeenCalledWith(
                'user-sable',
                {
                    countryId: dto.countryId,
                    gender: dto.gender,
                    name: dto.name,
                }
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdateProfile,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('writes and stages nothing when the country is missing', async () => {
            const dto: UserUpdateProfileRequestDto = {
                name: 'Sable Grove Jr.',
                countryId: 'country-missing',
                gender: EnumUserGender.male,
            };
            countryDomain.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                service.updateProfile('user-sable', dto)
            ).rejects.toBeInstanceOf(CountryNotFoundException);

            expect(userProfileDomain.updateProfile).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('passes a null name through to clear it', async () => {
            const dto: UserUpdateProfileRequestDto = {
                name: null,
                countryId: 'country-sable',
                gender: EnumUserGender.male,
            };

            await service.updateProfile('user-sable', dto);

            expect(userProfileDomain.updateProfile).toHaveBeenCalledWith(
                'user-sable',
                {
                    countryId: dto.countryId,
                    gender: dto.gender,
                    name: null,
                }
            );
        });
    });

    describe('generatePhotoProfilePresign', () => {
        it('wraps the presign in a response envelope', async () => {
            const dto: UserGeneratePhotoProfileRequestDto = {
                extension: EnumFileExtensionImage.png,
                size: 2048,
            };
            const presign: IAwsS3Presign = {
                key: 'photo-profile/user-sable/random.png',
                mime: 'image/png',
                extension: 'png',
                presignUrl: 'https://s3.example.com/presign',
                expiredInSeconds: 60,
            };
            userProfileDomain.generatePhotoProfilePresign.mockResolvedValue(
                presign
            );

            await expect(
                service.generatePhotoProfilePresign('user-sable', dto)
            ).resolves.toEqual({ data: presign });
            expect(
                userProfileDomain.generatePhotoProfilePresign
            ).toHaveBeenCalledWith('user-sable', {
                extension: dto.extension,
                size: dto.size,
            });
        });
    });

    describe('updatePhotoProfile', () => {
        it('delegates the update to the domain', async () => {
            const dto: UserUpdateProfilePhotoRequestDto = {
                key: 'photo-profile/user-sable/random.png',
            };

            await service.updatePhotoProfile('user-sable', dto);

            expect(userProfileDomain.updatePhotoProfile).toHaveBeenCalledWith(
                'user-sable',
                { key: dto.key }
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdatePhotoProfile,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('stages nothing when the domain write rejects', async () => {
            userProfileDomain.updatePhotoProfile.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.updatePhotoProfile('user-sable', {
                    key: 'photo-profile/user-sable/random.png',
                })
            ).rejects.toThrow('boom');

            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('uploadPhotoProfile', () => {
        it('delegates the file to the domain', async () => {
            const file = {
                originalname: 'photo.png',
                size: 2048,
                buffer: Buffer.from('binary-data'),
            } as IFile;

            await service.uploadPhotoProfile('user-sable', file);

            expect(userProfileDomain.uploadPhotoProfile).toHaveBeenCalledWith(
                'user-sable',
                file
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userUpdatePhotoProfile,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });
    });

    describe('claimUsername', () => {
        it('delegates the username to the domain', async () => {
            const dto: UserClaimUsernameRequestDto = {
                username: 'sableGrove' as Lowercase<string>,
            };

            await service.claimUsername('user-sable', dto);

            expect(userProfileDomain.claimUsername).toHaveBeenCalledWith(
                'user-sable',
                dto.username
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userClaimUsername,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });
    });
});
