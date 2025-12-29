import { ApiProperty } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import { EnumUserLoginFrom, EnumUserLoginWith } from '@prisma/client';

export class EmailLoginDto {
    @ApiProperty({
        required: true,
        enum: EnumUserLoginFrom,
        example: EnumUserLoginFrom.website,
    })
    loginFrom: EnumUserLoginFrom;

    @ApiProperty({
        required: true,
        enum: EnumUserLoginWith,
        example: EnumUserLoginWith.credential,
    })
    loginWith: EnumUserLoginWith;

    @ApiProperty({
        required: true,
        example: faker.internet.ipv4(),
    })
    ipAddress: string;

    @ApiProperty({
        required: true,
        example: faker.date.recent().toISOString(),
    })
    loginAt: string;
}
