import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { PermissionService } from 'src/modules/permission/services/permission.service';

@Injectable()
export class MigrationPermissionSeed {
    constructor(private readonly permissionService: PermissionService) {}

    @Command({
        command: 'seed:permission',
        describe: 'seed permissions',
    })
    async seeds(): Promise<void> {
        try {
            const permissions: string[] = Object.values(ENUM_AUTH_PERMISSIONS);
            const group: string[] = Object.values(ENUM_PERMISSION_GROUP);

            const data: PermissionCreateDto[] = permissions.map((val) => {
                const dto: PermissionCreateDto = new PermissionCreateDto();

                dto.code = val;
                dto.description = `${val.replace('_', ' ')} description`;
                dto.group = group.find((l: string) =>
                    val.startsWith(l)
                ) as ENUM_PERMISSION_GROUP;

                return dto;
            }) as PermissionEntity[];

            await this.permissionService.createMany(data);
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }

    @Command({
        command: 'remove:permission',
        describe: 'remove permissions',
    })
    async remove(): Promise<void> {
        try {
            await this.permissionService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
