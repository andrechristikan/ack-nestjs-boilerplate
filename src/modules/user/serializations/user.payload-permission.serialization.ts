import { faker } from '@faker-js/faker';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UserGetSerialization } from 'src/modules/user/serializations/user.get.serialization';

export class UserPayloadPermissionSerialization extends PickType(
    UserGetSerialization,
    ['_id'] as const
) {
    @ApiProperty({
        example: [faker.name.jobTitle(), faker.name.jobTitle()],
        type: 'string',
        isArray: true,
    })
    @Transform(({ value }) => value?.map((val) => val.code) ?? [])
    readonly permissions: string[];
}
