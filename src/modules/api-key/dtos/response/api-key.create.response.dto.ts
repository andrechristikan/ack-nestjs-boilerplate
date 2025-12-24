import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { EnumApiKeyType } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class ApiKeyCreateResponseDto extends ApiKeyDto {
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
    type: EnumApiKeyType;

    @ApiHideProperty()
    @Exclude()
    key: string;
}
