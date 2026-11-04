from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel, Field

T = TypeVar("T")


class PageParams(BaseModel):
    """Paramètres de pagination standardisés."""
    page: int = Field(1, ge=1, description="Numéro de page (1-indexé)")
    page_size: int = Field(50, ge=1, le=500, description="Éléments par page (max 500)")


class PaginatedResponse(BaseModel, Generic[T]):
    """Réponse paginée standardisée."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(cls, items: List[T], total: int, params: PageParams) -> "PaginatedResponse[T]":
        total_pages = (total + params.page_size - 1) // params.page_size
        return cls(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages,
        )