import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { EnumRoleType } from '@generated/prisma-client';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { UserDto } from '@modules/user/dtos/user.dto';
import { UserMobileNumberResponseDto } from '@modules/user/dtos/response/user.mobile-number.response.dto';

export class UserProfileResponseDto extends UserDto {
    @ApiProperty({
        required: true,
        type: RoleDto,
        description: 'Role assigned to the user',
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
            name: faker.person.jobTitle(),
            description: faker.lorem.sentence(),
            type: EnumRoleType.admin,
            abilities: [],
        },
    })
    @Expose()
    @Type(() => RoleDto)
    role: RoleDto;

    @ApiProperty({
        required: true,
        type: CountryResponseDto,
        description: 'Country of the user',
        example: {
            id: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent(),
            createdBy: faker.database.mongodbObjectId(),
            updatedAt: faker.date.recent(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.database.mongodbObjectId(),
            name: faker.location.country(),
            alpha2Code: faker.location.countryCode('alpha-2'),
            alpha3Code: faker.location.countryCode('alpha-3'),
            phoneCode: [faker.helpers.arrayElement(['62', '65'])],
            continent: faker.location.country(),
            timezone: faker.location.timeZone(),
        },
    })
    @Expose()
    @Type(() => CountryResponseDto)
    country: CountryResponseDto;

    @ApiProperty({
        required: false,
        type: [UserMobileNumberResponseDto],
        description: 'Mobile numbers registered to the user',
        example: [],
    })
    @Expose()
    @Type(() => UserMobileNumberResponseDto)
    mobileNumbers?: UserMobileNumberResponseDto[];
}
