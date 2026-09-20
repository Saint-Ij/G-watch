from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field


from utils.json_store import (
    add_record,
    find_by_id,
    read_records,
)
from utils.pagination import paginate


router = APIRouter(
    prefix="/products",
    tags=["Products"],
)

PRODUCTS_FILE = "products.json"


class ProductCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=150,
    )

    description: str = Field(
        min_length=2,
        max_length=500,
    )

    category: str = Field(
        min_length=2,
        max_length=100,
    )

    price: float = Field(
        gt=0,
    )

    stock: int = Field(
        ge=0,
    )


@router.get("")
def list_products(
    page: int = Query(
        default=1,
        ge=1,
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
):
    products = read_records(PRODUCTS_FILE)

    return paginate(
        records=products,
        page=page,
        limit=limit,
    )


@router.get("/{product_id}")
def get_product(product_id: int):
    products = read_records(PRODUCTS_FILE)

    product = find_by_id(
        records=products,
        record_id=product_id,
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return product


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_product(product_data: ProductCreate):
    new_product = {
        "name": product_data.name,
        "description": product_data.description,
        "category": product_data.category,
        "price": round(product_data.price, 2),
        "stock": product_data.stock,
        "created_at": (
            datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
        ),
    }

    return add_record(
        filename=PRODUCTS_FILE,
        record=new_product,
    )
