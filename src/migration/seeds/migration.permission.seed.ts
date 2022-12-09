import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { PermissionBulkService } from 'src/modules/permission/services/permission.bulk.service';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionUseCase } from 'src/modules/permission/use-cases/permission.use-case';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

@Injectable()
export class PermissionSeed {
    constructor(
        private readonly permissionUseCase: PermissionUseCase,
        private readonly permissionBulkService: PermissionBulkService
    ) {}

    @Command({
        command: 'seed:permission',
        describe: 'seed permissions',
    })
    async seeds(): Promise<void> {
        try {
            const permissions: string[] = Object.values(ENUM_AUTH_PERMISSIONS);
            const group: string[] = Object.values(ENUM_PERMISSION_GROUP);

            const data: PermissionCreateDto[] = permissions.map((val) => {
                return {
                    code: val,
                    name: val.replace('_', ' '),
                    description: `${val.replace('_', ' ')} description`,
                    group: group.find((l: string) =>
                        val.toUpperCase().startsWith(l.toUpperCase())
                    ),
                };
            }) as PermissionCreateDto[];

            const maps: Promise<PermissionEntity>[] = data.map((value) =>
                this.permissionUseCase.create(value)
            );

            const create: PermissionEntity[] = await Promise.all(maps);

            await this.permissionBulkService.createMany(create);
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
            await this.permissionBulkService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }

        return;
    }
}
