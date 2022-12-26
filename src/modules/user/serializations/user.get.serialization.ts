import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { RoleGetSerialization } from 'src/modules/role/serializations/role.get.serialization';

export class UserGetSerialization {
    @ApiProperty({ example: faker.datatype.uuid() })
    @Type(() => String)
    readonly _id: string;

    @ApiProperty({
        type: () => RoleGetSerialization,
    })
    @Type(() => RoleGetSerialization)
    readonly role: RoleGetSerialization;

    @ApiProperty({
        example: faker.internet.email(),
    })
    readonly email: string;

    @ApiProperty({
        example: faker.internet.email(),
    })
    readonly mobileNumber: string;

    @ApiProperty({
        example: true,
    })
    readonly isActive: boolean;

    @ApiProperty({
        example: faker.name.firstName(),
    })
    readonly firstName: string;

    @ApiProperty({
        example: faker.name.lastName(),
    })
    readonly lastName: string;

    @ApiProperty({
        allOf: [{ $ref: getSchemaPath(AwsS3Serialization) }],
    })
    readonly photo?: AwsS3Serialization;

    @Exclude()
    readonly password: string;

    @ApiProperty({
        example: faker.date.future(),
    })
    readonly passwordExpired: Date;

    @ApiProperty({
        example: [1, 0],
    })
    readonly passwordAttempt: number;

    @ApiProperty({
        example: faker.date.recent(),
    })
    readonly signUpDate: Date;

    @Exclude()
    readonly salt: string;

    @ApiProperty({
        example: faker.date.past(),
    })
    readonly createdAt: Date;

    @ApiProperty({
        example: faker.date.past(),
    })
    readonly updatedAt: Date;
}
