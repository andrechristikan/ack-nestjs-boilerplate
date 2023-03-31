import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RoleUsedGuard implements CanActivate {
    // constructor(private readonly userService: UserService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // const { __role } = context.switchToHttp().getRequest();
        // const check: UserEntity = await this.userService.findOne(
        //     {
        //         role: __role._id,
        //     },
        //     {
        //         returnPlain: true,
        //     }
        // );

        // if (check) {
        //     throw new BadRequestException({
        //         statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_USED_ERROR,
        //         message: 'role.error.used',
        //     });
        // }
        return true;
    }
}
