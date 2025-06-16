import { ApiProperty } from '@nestjs/swagger';
import { IFile } from '@common/file/interfaces/file.interface';

export class FileSingleDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Single file',
    })
    file: IFile;
}
