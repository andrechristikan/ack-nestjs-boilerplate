import { ApiProperty } from '@nestjs/swagger';

export class FileMultipleDto {
    @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
    files: any[];
}
