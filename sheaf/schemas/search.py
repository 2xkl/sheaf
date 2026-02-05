from pydantic import BaseModel


class SearchResultItem(BaseModel):
    id: str
    original_name: str
    snippet: str
    rank: float


class SearchResponse(BaseModel):
    query: str
    total: int
    items: list[SearchResultItem]
