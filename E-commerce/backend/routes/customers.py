from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field

from utils.json_store import (
    add_record,
    find_by_id,
    read_records,
)
from utils.pagination import paginate


router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)

CUSTOMERS_FILE = "customers.json"


class AddressCreate(BaseModel):
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


class CustomerCreate(BaseModel):
    first_name: str = Field(
        min_length=2,
        max_length=100,
    )

    last_name: str = Field(
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    phone: str = Field(
        min_length=10,
        max_length=20,
    )

    address: AddressCreate


@router.get("")
def list_customers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
):
    customers = read_records(CUSTOMERS_FILE)

    return paginate(
        records=customers,
        page=page,
        limit=limit,
    )


@router.get("/{customer_id}/address")
def get_customer_address(customer_id: int):
    customers = read_records(CUSTOMERS_FILE)

    customer = find_by_id(
        records=customers,
        record_id=customer_id,
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return {
        "customer_id": customer["id"],
        "address": customer["address"],
    }


@router.get("/{customer_id}")
def get_customer(customer_id: int):
    customers = read_records(CUSTOMERS_FILE)

    customer = find_by_id(
        records=customers,
        record_id=customer_id,
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return customer


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_customer(customer_data: CustomerCreate):
    customers = read_records(CUSTOMERS_FILE)

    normalized_email = str(customer_data.email).lower()

    email_exists = any(
        customer["email"].lower() == normalized_email
        for customer in customers
    )

    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A customer with this email already exists",
        )

    new_customer = {
        "first_name": customer_data.first_name,
        "last_name": customer_data.last_name,
        "email": normalized_email,
        "phone": customer_data.phone,
        "created_at": (
            datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
        ),
        "address": customer_data.address.model_dump(),
    }

    return add_record(
        filename=CUSTOMERS_FILE,
        record=new_customer,
    )
