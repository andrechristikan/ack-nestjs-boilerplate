import { ApiProperty } from '@nestjs/swagger';
import { IFile } from 'src/common/file/interfaces/file.interface';

export class FileMultipleDto {
    @ApiProperty({
        type: 'array',
        items: { type: 'string', format: 'binary', description: 'Multi file' },
    })
    files: IFile[];
}
