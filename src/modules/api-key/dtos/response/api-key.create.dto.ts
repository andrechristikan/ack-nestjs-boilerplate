import { ApiProperty, PickType } from '@nestjs/swagger';
import { ApiKeyGetResponseDto } from 'src/modules/api-key/dtos/response/api-key.get.response.dto';

export class ApiKeyCreateResponseDto extends PickType(ApiKeyGetResponseDto, [
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
