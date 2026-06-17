import { ApiProperty } from '@nestjs/swagger';
import { IFile } from '@common/file/interfaces/file.interface';

/**
 * Multipart body shape for endpoints accepting multiple file uploads.
 */
export class FileUploadMultipleRequestDto {
    @ApiProperty({
        type: 'array',
        items: { type: 'string', format: 'binary', description: 'Multi file' },
    })
    files: IFile[];
}
