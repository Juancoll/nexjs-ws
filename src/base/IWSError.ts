import { WSErrorCode } from './WSErrorCode';

export interface IWSError {
    code: WSErrorCode;
    message?: string;
}
