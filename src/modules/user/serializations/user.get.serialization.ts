import { faker } from '@faker-js/faker';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { IRoleDocument } from 'src/modules/role/interfaces/role.interface';

export class UserGetSerialization {
    @ApiProperty({ example: faker.database.mongodbObjectId() })
    @Type(() => String)
    readonly _id: string;

    @ApiProperty({
        example: {
            name: faker.name.jobTitle(),
            permissions: [
                faker.database.mongodbObjectId(),
                faker.database.mongodbObjectId(),
            ],
            accessFor: 'ADMIN',
            isActive: true,
        },
        type: 'object',
    })
    @Transform(({ value }) => ({
        name: value.name,
        permissions: value.permissions.map((val: Record<string, any>) => ({
            name: val.name,
            isActive: val.isActive,
            code: val.code,
        })),
        accessFor: value.accessFor,
        isActive: value.isActive,
    }))
    readonly role: IRoleDocument;

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

    @ApiProperty({
        example: faker.name.fullName(),
    })
    @Expose()
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    @Exclude()
    readonly password: string;

    @ApiProperty({
        example: faker.date.future(),
    })
    readonly passwordExpired: Date;

    @Exclude()
    readonly salt: string;

    @ApiProperty({
        example: faker.date.past(),
    })
    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
