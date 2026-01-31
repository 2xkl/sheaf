import redis.asyncio as redis

from sheaf.config import settings

_pool: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _pool
    if _pool is None:
        _pool = redis.from_url(settings.redis_url, decode_responses=False)
    return _pool


async def cache_get(key: str) -> bytes | None:
    r = await get_redis()
    return await r.get(key)


async def cache_set(key: str, value: bytes, ttl: int | None = None) -> None:
    r = await get_redis()
    await r.set(key, value, ex=ttl or settings.cache_ttl_seconds)


async def cache_delete(key: str) -> None:
    r = await get_redis()
    await r.delete(key)


async def close_redis() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None
