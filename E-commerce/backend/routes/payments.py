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
    prefix="/payments",
    tags=["Payments"],
)

PAYMENTS_FILE = "payments.json"
ORDERS_FILE = "orders.json"


class PaymentCreate(BaseModel):
    order_id: int = Field(ge=1)

    payment_method: str = Field(
        min_length=2,
        max_length=50,
    )

    amount: float | None = Field(
        default=None,
        gt=0,
    )

    status: str = Field(
        default="PENDING",
        min_length=2,
        max_length=30,
    )


@router.get("")
def list_payments(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    customer_id: int | None = Query(default=None, ge=1),
    order_id: int | None = Query(default=None, ge=1),
    payment_status: str | None = Query(
        default=None,
        alias="status",
    ),
):
    payments = read_records(PAYMENTS_FILE)

    if customer_id is not None:
        payments = [
            payment
            for payment in payments
            if payment["customer_id"] == customer_id
        ]

    if order_id is not None:
        payments = [
            payment
            for payment in payments
            if payment["order_id"] == order_id
        ]

    if payment_status is not None:
        normalized_status = payment_status.upper()

        payments = [
            payment
            for payment in payments
            if payment["status"].upper() == normalized_status
        ]

    return paginate(
        records=payments,
        page=page,
        limit=limit,
    )


@router.get("/{payment_id}")
def get_payment(payment_id: int):
    payments = read_records(PAYMENTS_FILE)

    payment = find_by_id(
        records=payments,
        record_id=payment_id,
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return payment


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_payment(payment_data: PaymentCreate):
    orders = read_records(ORDERS_FILE)
    payments = read_records(PAYMENTS_FILE)

    order = find_by_id(
        records=orders,
        record_id=payment_data.order_id,
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    normalized_status = payment_data.status.upper()

    allowed_statuses = {
        "SUCCESSFUL",
        "PENDING",
        "FAILED",
        "REFUNDED",
    }

    if normalized_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Payment status must be SUCCESSFUL, "
                "PENDING, FAILED, or REFUNDED"
            ),
        )

    normalized_method = payment_data.payment_method.upper()

    allowed_methods = {
        "CARD",
        "BANK_TRANSFER",
        "USSD",
        "WALLET",
    }

    if normalized_method not in allowed_methods:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Payment method must be CARD, "
                "BANK_TRANSFER, USSD, or WALLET"
            ),
        )

    if normalized_status == "SUCCESSFUL":
        successful_payment_exists = any(
            payment["order_id"] == order["id"]
            and payment["status"].upper() == "SUCCESSFUL"
            for payment in payments
        )

        if successful_payment_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A successful payment already exists "
                    "for this order"
                ),
            )

    if payment_data.amount is None:
        payment_amount = float(order["total_amount"])
    else:
        payment_amount = round(payment_data.amount, 2)

    next_payment_id = max(
        (payment["id"] for payment in payments),
        default=0,
    ) + 1

    transaction_reference = (
        f"PAY-2026-{next_payment_id:06d}"
    )

    new_payment = {
        "order_id": order["id"],
        "customer_id": order["customer_id"],
        "amount": payment_amount,
        "payment_method": normalized_method,
        "status": normalized_status,
        "transaction_reference": transaction_reference,
        "created_at": (
            datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
        ),
    }

    return add_record(
        filename=PAYMENTS_FILE,
        record=new_payment,
    )