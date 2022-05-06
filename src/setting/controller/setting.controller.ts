import {
    Body,
    Controller,
    Get,
    InternalServerErrorException,
    Put,
    Query,
} from '@nestjs/common';
import { AuthAdminJwtGuard } from 'src/auth/auth.decorator';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { ENUM_STATUS_CODE_ERROR } from 'src/utils/error/error.constant';
import { PaginationService } from 'src/utils/pagination/service/pagination.service';
import { RequestParamGuard } from 'src/utils/request/request.decorator';
import {
    Response,
    ResponsePaging,
} from 'src/utils/response/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/utils/response/response.interface';
import { SettingListDto } from '../dto/setting.list.dto';
import { SettingRequestDto } from '../dto/setting.request.dto';
import { SettingUpdateDto } from '../dto/setting.update.dto';
import { SettingDocument } from '../schema/setting.schema';
import { SettingListSerialization } from '../serialization/setting.list.serialization';
import { SettingService } from '../service/setting.service';
import {
    GetSetting,
    SettingGetGuard,
    SettingUpdateGuard,
} from '../setting.decorator';

@Controller({
    version: '1',
    path: 'setting',
})
export class SettingAdminController {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly settingService: SettingService,
        private readonly paginationService: PaginationService
    ) {}

    @ResponsePaging('setting.list')
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.SETTING_READ)
    @Get('/list')
    async list(
        @Query()
        {
            page,
            perPage,
            sort,
            search,
            availableSort,
            availableSearch,
        }: SettingListDto
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        const find: Record<string, any> = {};

        if (search) {
            find['$or'] = [
                {
                    name: {
                        $regex: new RegExp(search),
                        $options: 'i',
                    },
                },
            ];
        }
        const settings: SettingDocument[] = await this.settingService.findAll(
            find,
            {
                limit: perPage,
                skip: skip,
                sort,
            }
        );
        const totalData: number = await this.settingService.getTotal(find);
        const totalPage: number = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        const data: SettingListSerialization[] =
            await this.settingService.serializationList(settings);

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            availableSearch,
            availableSort,
            data,
        };
    }

    @Response('setting.get')
    @SettingGetGuard()
    @RequestParamGuard(SettingRequestDto)
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.SETTING_READ)
    @Get('get/:setting')
    async get(@GetSetting() setting: SettingDocument): Promise<IResponse> {
        return this.settingService.serializationGet(setting);
    }

    @Response('setting.update')
    @SettingUpdateGuard()
    @RequestParamGuard(SettingRequestDto)
    @AuthAdminJwtGuard(
        ENUM_PERMISSIONS.SETTING_READ,
        ENUM_PERMISSIONS.SETTING_UPDATE
    )
    @Put('/update/:setting')
    async update(
        @GetSetting() setting: SettingDocument,
        @Body()
        body: SettingUpdateDto
    ): Promise<IResponse> {
        try {
            await this.settingService.updateOneById(setting._id, body);
        } catch (err: any) {
            this.debuggerService.error(
                'update try catch',
                'SettingController',
                'update',
                err
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }

        return {
            _id: setting._id,
        };
    }
}
