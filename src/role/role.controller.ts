import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Post,
    Query
} from '@nestjs/common';
import { AuthJwtGuard } from 'src/auth/auth.decorator';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { RoleService } from './role.service';
import { PaginationService } from 'src/pagination/pagination.service';
import { RoleDocument } from './role.interface';
import { Response } from 'src/response/response.decorator';
import { IResponse, IResponsePaging } from 'src/response/response.interface';
import { RequestQueryValidationPipe } from 'src/request/pipe/request.query.validation.pipe';
import { RoleListValidation } from './validation/role.list.validation';
import { ENUM_ROLE_STATUS_CODE_ERROR } from './role.constant';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { RoleCreateValidation } from './validation/role.create.validation';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';
import { Types } from 'mongoose';

@Controller('/role')
export class RoleController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService
    ) {}

    @Get('/')
    @AuthJwtGuard(ENUM_PERMISSIONS.ROLE_READ)
    @Response('role.findAll')
    async findAll(
        @Query(RequestQueryValidationPipe)
        { page, perPage, sort }: RoleListValidation
    ): Promise<IResponsePaging> {
        const skip = await this.paginationService.skip(page, perPage);
        const roles: RoleDocument[] = await this.roleService.findAll<RoleDocument>(
            {},
            {
                skip: skip,
                limit: perPage,
                sort
            }
        );

        const totalData: number = await this.roleService.getTotalData();
        const totalPage = await this.paginationService.totalPage(
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

    @Post('/create')
    @AuthJwtGuard(ENUM_PERMISSIONS.ROLE_READ, ENUM_PERMISSIONS.ROLE_DELETE)
    @Response('user.create')
    async create(
        @Body(RequestValidationPipe)
        { name, permissions }: RoleCreateValidation
    ): Promise<IResponse> {
        const check: RoleDocument = await this.roleService.findOne({
            name: name.toLowerCase()
        });
        if (check) {
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
            const rPermisisons: Types.ObjectId[] = permissions.map(
                (val) => new Types.ObjectId(val)
            );
            const create = await this.roleService.create({
                name,
                permissions: rPermisisons
            });

            return {
                _id: create._id
            };
        } catch (err: any) {
            this.debuggerService.error('create try catch', {
                class: 'UserController',
                function: 'create',
                error: err
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }

    @Delete('/delete/:_id')
    @AuthJwtGuard(ENUM_PERMISSIONS.ROLE_READ, ENUM_PERMISSIONS.ROLE_DELETE)
    @Response('role.delete')
    async delete(@Param('_id') _id: string): Promise<void> {
        const role: RoleDocument = await this.roleService.findOneById<RoleDocument>(
            _id
        );
        if (!role) {
            this.debuggerService.error('Role Error', {
                class: 'RoleController',
                function: 'delete'
            });

            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound'
            });
        }

        try {
            await this.roleService.deleteOneById(_id);
            return;
        } catch (err) {
            this.debuggerService.error('delete try catch', {
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
}
