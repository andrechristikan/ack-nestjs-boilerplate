import { Injectable } from '@nestjs/common';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { IPermissionEnumService } from 'src/modules/permission/interfaces/permission.enum-service.interface';

@Injectable()
export class PermissionEnumService implements IPermissionEnumService {
    async getGroup(): Promise<string[]> {
        return Object.values(ENUM_PERMISSION_GROUP);
    }
}
