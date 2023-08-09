import { Injectable, CanActivate, ExecutionContext, Scope } from '@nestjs/common';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

@Injectable({ scope: Scope.REQUEST })
export class RequestUrlencodedBodyParserGuard implements CanActivate {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'request.body.urlencoded.maxFileSize'
        );
    }

    canActivate(context: ExecutionContext): boolean {
        // bodyParser.urlencoded({
        //     extended: false,
        //     limit: this.maxFile,
        // })(context.switchToHttp().getRequest(), context.switchToHttp().getResponse());
        //
        return true;
    }
}

@Injectable({ scope: Scope.REQUEST })
export class RequestJsonBodyParserGuard implements CanActivate {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'request.body.json.maxFileSize'
        );
    }

    canActivate(context: ExecutionContext): boolean {
        // bodyParser.json({
        //     limit: this.maxFile,
        // })(context.switchToHttp().getRequest(), context.switchToHttp().getResponse());
        //
        return true;
    }
}

@Injectable({ scope: Scope.REQUEST })
export class RequestRawBodyParserGuard implements CanActivate {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'request.body.raw.maxFileSize'
        );
    }

    canActivate(context: ExecutionContext): boolean {
        // bodyParser.raw({
        //     limit: this.maxFile,
        // })(context.switchToHttp().getRequest(), context.switchToHttp().getResponse());
        //
        return true;
    }
}

@Injectable({ scope: Scope.REQUEST })
export class RequestTextBodyParserGuard implements CanActivate {
    private readonly maxFile: number;

    constructor(private readonly configService: ConfigService) {
        this.maxFile = this.configService.get<number>(
            'request.body.text.maxFileSize'
        );
    }

    canActivate(context: ExecutionContext): boolean {
        // bodyParser.text({
        //     limit: this.maxFile,
        // })(context.switchToHttp().getRequest(), context.switchToHttp().getResponse());

         return true;
    }
}
