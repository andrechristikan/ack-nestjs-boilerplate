import { ApiProperty } from '@nestjs/swagger';
import { IFile } from '@common/file/interfaces/file.interface';

/**
 * DTO class for handling multiple file uploads.
 * This class defines the structure for API endpoints that accept multiple files.
 */
export class FileMultipleDto {
    @ApiProperty({
        type: 'array',
        items: { type: 'string', format: 'binary', description: 'Multi file' },
    })
    files: IFile[];
}
