"""Exceções da aplicação e handlers globais com respostas padronizadas."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Erro de negócio com status HTTP e mensagem legível para o usuário."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class NotFoundError(AppException):
    def __init__(self, detail: str = "Registro não encontrado.") -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, detail)


class BadRequestError(AppException):
    def __init__(self, detail: str) -> None:
        super().__init__(status.HTTP_400_BAD_REQUEST, detail)


class ConflictError(AppException):
    def __init__(self, detail: str = "Registro já existe.") -> None:
        super().__init__(status.HTTP_409_CONFLICT, detail)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Dados inválidos.", "errors": jsonable_encoder(exc.errors())},
        )

    @app.exception_handler(ServerSelectionTimeoutError)
    @app.exception_handler(ConnectionFailure)
    async def database_unavailable_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.error("MongoDB indisponível: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Não foi possível conectar ao banco de dados."},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Erro não tratado: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Erro interno do servidor."},
        )
