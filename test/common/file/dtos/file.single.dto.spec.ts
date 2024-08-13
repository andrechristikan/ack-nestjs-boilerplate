import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { FileSingleDto } from 'src/common/file/dtos/file.single.dto';
import { IFile } from 'src/common/file/interfaces/file.interface';

describe('FileSingleDto', () => {
    it('should create a valid FileSingleDto object', () => {
        const mockFileSingleDto: FileSingleDto = {
            file: {} as IFile,
        };

        const dto = plainToInstance(FileSingleDto, mockFileSingleDto);

        expect(dto).toBeInstanceOf(FileSingleDto);
    });
});
