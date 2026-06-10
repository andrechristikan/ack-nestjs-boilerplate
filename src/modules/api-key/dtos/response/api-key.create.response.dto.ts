import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { EnumApiKeyType } from '@generated/prisma-client';
import { Exclude, Expose } from 'class-transformer';
import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';

export class ApiKeyCreateResponseDto extends ApiKeyResponseDto {
    @ApiProperty({
        description: 'Secret key of ApiKey, only show at once',
        example: true,
        required: true,
    })
    @Expose()
    secret: string;

    @ApiHideProperty()
    @Exclude()
    isActive: boolean;

    @ApiHideProperty()
    @Exclude()
    startAt?: Date;

    @ApiHideProperty()
    @Exclude()
    endAt?: Date;

    @ApiHideProperty()
    @Exclude()
    name: string;

    @ApiHideProperty()
    @Exclude()
    type: EnumApiKeyType;

    @ApiHideProperty()
    @Exclude()
    key: string;
}
