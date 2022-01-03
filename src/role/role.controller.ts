import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    InternalServerErrorException,
    Post,
    Query
} from '@nestjs/common';
import { AuthJwtGuard } from 'src/auth/auth.decorator';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { RoleService } from './role.service';
import { PaginationService } from 'src/pagination/pagination.service';
import { IRoleDocument, RoleDocument } from './role.interface';
import { Response, ResponsePaging } from 'src/response/response.decorator';
import { IResponse, IResponsePaging } from 'src/response/response.interface';
import { RoleListValidation } from './validation/role.list.validation';
import { ENUM_ROLE_STATUS_CODE_ERROR } from './role.constant';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { RoleCreateValidation } from './validation/role.create.validation';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';
import { modelNames } from 'mongoose';
import { GetRole, RoleGetGuard } from './role.decorator';

@Controller('/role')
export class RoleController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService
    ) {}

    @ResponsePaging('role.list')
    @AuthJwtGuard(ENUM_PERMISSIONS.ROLE_READ)
    @Get('/list')
    async list(
        @Query(RequestValidationPipe)
        { page, perPage, sort, search }: RoleListValidation
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        const find: Record<string, any> = {};
        if (search) {
            find['$or'] = [
                {
                    name: {
                        $regex: new RegExp(search),
                        $options: 'i'
                    }
                }
            ];
        }

        const roles: RoleDocument[] = await this.roleService.findAll(find, {
            skip: skip,
            limit: perPage,
            sort
        });

        const totalData: number = await this.roleService.getTotal({});
        const totalPage: number = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            data: roles
        };
    }

    @Response('role.get')
    @RoleGetGuard()
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ)
    @Get('get/:role')
    async get(@GetRole() role: IRoleDocument): Promise<IResponse> {
        return role;
    }

    @Response('role.create')
    @AuthJwtGuard(ENUM_PERMISSIONS.ROLE_READ, ENUM_PERMISSIONS.ROLE_DELETE)
    @Post('/create')
    async create(
        @Body(RequestValidationPipe)
        { name, permissions }: RoleCreateValidation
    ): Promise<IResponse> {
        const exist: RoleDocument = await this.roleService.findOne({
            name: modelNames
        });
        if (exist) {
            this.debuggerService.error('Role Error', {
                class: 'RoleController',
                function: 'delete'
            });

            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR,
                message: 'role.error.exist'
            });
        }

        try {
            const create = await this.roleService.create({
                name,
                permissions
            });

            return {
                _id: create._id
            };
        } catch (err: any) {
            this.debuggerService.error('create try catch', {
                class: 'RoleController',
                function: 'create',
                error: err
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }

    @Response('role.delete')
    @RoleGetGuard()
    @AuthJwtGuard(ENUM_PERMISSIONS.ROLE_READ, ENUM_PERMISSIONS.ROLE_DELETE)
    @Delete('/delete/:role')
    async delete(@GetRole() role: IRoleDocument): Promise<void> {
        try {
            await this.roleService.deleteOneById(role._id);
            return;
        } catch (err) {
            this.debuggerService.error('delete try catch', {
                class: 'RoleController',
                function: 'delete',
                error: err
            });
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }
}
