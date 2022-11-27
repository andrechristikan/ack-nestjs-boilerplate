import { faker } from '@faker-js/faker';
import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { valid } from 'joi';
import { UserGetSerialization } from 'src/modules/user/serializations/user.get.serialization';

export class AuthGrantPermissionSerialization extends PickType(
    UserGetSerialization,
    ['_id'] as const
) {
    @ApiProperty({
        example: [faker.name.jobTitle(), faker.name.jobTitle()],
        type: 'string',
        isArray: true,
    })
    @Transform(({ value }) => value?.code ?? [])
    readonly permissions: string[];
}
