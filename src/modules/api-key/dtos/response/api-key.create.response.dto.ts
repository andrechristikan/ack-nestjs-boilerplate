import { ApiKeyResponseDto } from '@modules/api-key/dtos/response/api-key.response.dto';
import { ApiProperty, PickType } from '@nestjs/swagger';

export class ApiKeyCreateResponseDto extends PickType(ApiKeyResponseDto, [
    'key',
    '_id',
] as const) {
    @ApiProperty({
        description: 'Secret key of ApiKey, only show at once',
        example: true,
        required: true,
    })
    secret: string;
}
