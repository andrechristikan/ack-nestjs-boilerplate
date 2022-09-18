import { ApiProperty } from '@nestjs/swagger';

export class FileSingleDto {
    @ApiProperty({ type: 'string', format: 'binary' })
    file: any;
}
