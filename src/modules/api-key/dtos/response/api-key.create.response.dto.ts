import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';
import { ApiHideProperty, ApiProperty, PickType } from '@nestjs/swagger';
import { ENUM_API_KEY_TYPE } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class ApiKeyCreateResponseDto extends PickType(ApiKeyDto, [
    'hash',
    'key',
    'id',
] as const) {
    @ApiProperty({
        description: 'Secret key of ApiKey, only show at once',
        example: true,
        required: true,
    })
    secret: string;

    @ApiHideProperty()
    @Exclude()
    isActive: boolean;

    @ApiHideProperty()
    @Exclude()
    startDate?: Date;

    @ApiHideProperty()
    @Exclude()
    endDate?: Date;

    @ApiHideProperty()
    @Exclude()
    name?: string;

    @ApiHideProperty()
    @Exclude()
    type: ENUM_API_KEY_TYPE;

    @ApiHideProperty()
    @Exclude()
    key: string;
}
