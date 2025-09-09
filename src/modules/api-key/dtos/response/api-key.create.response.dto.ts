import { ApiKeyDto } from '@modules/api-key/dtos/api-key.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';

export class ApiKeyCreateResponseDto extends PickType(ApiKeyDto, [
    'key',
    'id',
] as const) {
    @ApiProperty({
        description: 'Secret key of ApiKey, only show at once',
        example: true,
        required: true,
    })
    secret: string;
}
