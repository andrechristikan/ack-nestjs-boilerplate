import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RequestUrlencodedBodyParserMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.urlencoded({
            extended: false,
            limit: this.configService.get<number>(
                'request.body.urlencoded.maxFileSize'
            ),
        })(req, res, next);
    }
}

@Injectable()
export class RequestJsonBodyParserMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.json({
            limit: this.configService.get<number>(
                'request.body.json.maxFileSize'
            ),
        })(req, res, next);
    }
}

@Injectable()
export class RequestRawBodyParserMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.raw({
            limit: this.configService.get<number>(
                'request.body.raw.maxFileSize'
            ),
        })(req, res, next);
    }
}

@Injectable()
export class RequestTextBodyParserMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.text({
            limit: this.configService.get<number>(
                'request.body.text.maxFileSize'
            ),
        })(req, res, next);
    }
}
