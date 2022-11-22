import {
    Controller,
    ForbiddenException,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthJwtPayload } from 'src/common/auth/decorators/auth.decorator';
import { AuthJwtAccessProtected } from 'src/common/auth/decorators/auth.jwt.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { IRoleEntity } from 'src/modules/role/interfaces/role.interface';
import { RoleService } from 'src/modules/role/services/role.service';

@ApiTags('modules.role')
@Controller({
    version: '1',
    path: '/role',
})
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Response('role.claim')
    @AuthJwtAccessProtected()
    @Post('/claim')
    async claim(@AuthJwtPayload() payload: Record<string, any>): Promise<void> {
        const role: IRoleEntity = await this.roleService.findOneByIdAndActive(
            payload.role
        );
        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        } else if (!role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_INACTIVE_ERROR,
                message: 'role.error.inactive',
            });
        }

        // try {
        //     await this.roleService.active(role._id);
        // } catch (err: any) {
        //     throw new InternalServerErrorException({
        //         statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
        //         message: 'http.serverError.internalServerError',
        //         error: err.message,
        //     });
        // }

        return;
    }
}
