import { ApiProperty } from '@nestjs/swagger';
import { IFile } from '@common/file/interfaces/file.interface';

/**
 * DTO class for handling single file upload.
 * This class defines the structure for API endpoints that accept a single file.
 */
export class FileSingleDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Single file',
    })
    file: IFile;
}
