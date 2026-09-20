
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from utils.json_store import (
    add_record,
    find_by_id,
    read_records,
)
from utils.pagination import paginate


router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)

ORDERS_FILE = "orders.json"
CUSTOMERS_FILE = "customers.json"
PRODUCTS_FILE = "products.json"


class OrderItemCreate(BaseModel):
    product_id: int = Field(
        ge=1,
    )

    quantity: int = Field(
        ge=1,
        le=100,
    )


class ShippingAddressCreate(BaseModel):
    street: str = Field(
        min_length=2,
        max_length=150,
    )

    city: str = Field(
        min_length=2,
        max_length=100,
    )

    state: str = Field(
        min_length=2,
        max_length=100,
    )

    country: str = Field(
        default="Nigeria",
        min_length=2,
        max_length=100,
    )

    postal_code: str = Field(
        min_length=3,
        max_length=20,
    )


class OrderCreate(BaseModel):
    customer_id: int = Field(
        ge=1,
    )

    items: List[OrderItemCreate] = Field(
        min_length=1,
        max_length=5,
    )

    shipping_address: Optional[ShippingAddressCreate] = None


@router.get("")
def list_orders(
    page: int = Query(
        default=1,
        ge=1,
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    customer_id: Optional[int] = Query(
        default=None,
        ge=1,
    ),
    order_status: Optional[str] = Query(
        default=None,
        alias="status",
    ),
):
    orders = read_records(ORDERS_FILE)

    if customer_id is not None:
        orders = [
            order
            for order in orders
            if order["customer_id"] == customer_id
        ]

    if order_status is not None:
        normalized_status = order_status.upper()

        orders = [
            order
            for order in orders
            if order["status"].upper() == normalized_status
        ]

    return paginate(
        records=orders,
        page=page,
        limit=limit,
    )


@router.get("/{order_id}")
def get_order(order_id: int):
    orders = read_records(ORDERS_FILE)

    order = find_by_id(
        records=orders,
        record_id=order_id,
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_order(order_data: OrderCreate):
    customers = read_records(CUSTOMERS_FILE)
    products = read_records(PRODUCTS_FILE)

    customer = find_by_id(
        records=customers,
        record_id=order_data.customer_id,
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    order_items = []

    for submitted_item in order_data.items:
        product = find_by_id(
            records=products,
            record_id=submitted_item.product_id,
        )

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"Product with ID "
                    f"{submitted_item.product_id} not found"
                ),
            )

        unit_price = float(product["price"])

        subtotal = round(
            submitted_item.quantity * unit_price,
            2,
        )

        order_items.append(
            {
                "product_id": product["id"],
                "quantity": submitted_item.quantity,
                "unit_price": unit_price,
                "subtotal": subtotal,
            }
        )

    total_amount = round(
        sum(item["subtotal"] for item in order_items),
        2,
    )

    if order_data.shipping_address is not None:
        shipping_address = (
            order_data.shipping_address.dict()
        )
    else:
        shipping_address = deepcopy(
            customer["address"]
        )

    new_order = {
        "customer_id": customer["id"],
        "items": order_items,
        "total_amount": total_amount,
        "status": "PENDING",
        "shipping_address": shipping_address,
        "created_at": (
            datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
        ),
    }

    return add_record(
        filename=ORDERS_FILE,
        record=new_order,
    )
