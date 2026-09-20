from __future__ import annotations

import random
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

from faker import Faker

from utils.json_store import write_records


CUSTOMER_COUNT = 100
PRODUCT_COUNT = 50
ORDER_COUNT = 500
PAYMENT_COUNT = 200

RANDOM_SEED = 42

fake = Faker()
Faker.seed(RANDOM_SEED)
random.seed(RANDOM_SEED)


NIGERIAN_LOCATIONS = [
    ("Kano", "Kano", "700001"),
    ("Kaduna", "Kaduna", "800001"),
    ("Zaria", "Kaduna", "810001"),
    ("Hadejia", "Jigawa", "731101"),
    ("Dutse", "Jigawa", "720001"),
    ("Lagos", "Lagos", "100001"),
    ("Ikeja", "Lagos", "100271"),
    ("Abuja", "FCT", "900001"),
    ("Ibadan", "Oyo", "200001"),
    ("Ilorin", "Kwara", "240001"),
    ("Jos", "Plateau", "930001"),
    ("Bauchi", "Bauchi", "740001"),
    ("Gombe", "Gombe", "760001"),
    ("Maiduguri", "Borno", "600001"),
    ("Sokoto", "Sokoto", "840001"),
    ("Katsina", "Katsina", "820001"),
    ("Minna", "Niger", "920001"),
    ("Enugu", "Enugu", "400001"),
    ("Abeokuta", "Ogun", "110001"),
    ("Akure", "Ondo", "340001"),
]


PRODUCTS = [
    ("Wireless Headphones", "Electronics", 28500.00),
    ("Bluetooth Speaker", "Electronics", 22000.00),
    ("Smartphone Charger", "Electronics", 6500.00),
    ("USB Flash Drive", "Electronics", 7500.00),
    ("Power Bank", "Electronics", 18000.00),
    ("Phone Tripod", "Electronics", 8500.00),
    ("Computer Mouse", "Electronics", 9500.00),
    ("Mechanical Keyboard", "Electronics", 32000.00),
    ("Laptop Backpack", "Accessories", 19500.00),
    ("Leather Wallet", "Accessories", 12000.00),
    ("Wristwatch", "Accessories", 26000.00),
    ("Sunglasses", "Accessories", 14500.00),
    ("Travel Bag", "Accessories", 31000.00),
    ("Baseball Cap", "Fashion", 7000.00),
    ("Cotton T-Shirt", "Fashion", 8500.00),
    ("Denim Trousers", "Fashion", 18000.00),
    ("Running Shoes", "Fashion", 29000.00),
    ("Traditional Fabric", "Fashion", 24000.00),
    ("Casual Shirt", "Fashion", 13500.00),
    ("Sandals", "Fashion", 11000.00),
    ("Cooking Pot Set", "Home", 35000.00),
    ("Table Lamp", "Home", 16500.00),
    ("Bedsheet Set", "Home", 21000.00),
    ("Electric Kettle", "Home", 18500.00),
    ("Wall Clock", "Home", 9500.00),
    ("Storage Basket", "Home", 6000.00),
    ("Standing Fan", "Home", 48000.00),
    ("Water Bottle", "Home", 5500.00),
    ("Python Programming Guide", "Books", 15000.00),
    ("Cybersecurity Fundamentals", "Books", 17500.00),
    ("Database Systems Textbook", "Books", 19000.00),
    ("Business Strategy Handbook", "Books", 12500.00),
    ("African Fiction Novel", "Books", 6500.00),
    ("Study Notebook", "Books", 3500.00),
    ("Body Lotion", "Beauty", 7500.00),
    ("Perfume Spray", "Beauty", 16500.00),
    ("Face Cleanser", "Beauty", 8500.00),
    ("Hair Cream", "Beauty", 5500.00),
    ("Bath Soap Pack", "Beauty", 4500.00),
    ("Sunscreen Lotion", "Beauty", 12000.00),
    ("Rice Bag 10kg", "Food", 24500.00),
    ("Vegetable Oil 5L", "Food", 14500.00),
    ("Breakfast Cereal", "Food", 6500.00),
    ("Milk Powder", "Food", 8500.00),
    ("Tea Pack", "Food", 4500.00),
    ("Coffee Jar", "Food", 7000.00),
    ("Biscuit Carton", "Food", 9500.00),
    ("Fruit Juice Pack", "Food", 8000.00),
    ("Pasta Carton", "Food", 18500.00),
    ("Spice Collection", "Food", 6000.00),
]


def iso_datetime() -> str:
    generated_datetime = fake.date_time_between(
        start_date="-1y",
        end_date="now",
        tzinfo=timezone.utc,
    )

    return generated_datetime.isoformat().replace("+00:00", "Z")


def generate_phone_number() -> str:
    prefixes = [
        "0701",
        "0703",
        "0705",
        "0706",
        "0708",
        "0802",
        "0803",
        "0805",
        "0806",
        "0807",
        "0809",
        "0810",
        "0813",
        "0814",
        "0816",
        "0817",
        "0818",
        "0903",
        "0909",
        "0913",
    ]

    prefix = random.choice(prefixes)
    remaining_digits = "".join(
        str(random.randint(0, 9))
        for _ in range(7)
    )

    return f"+234{prefix[1:]}{remaining_digits}"


def generate_address() -> dict:
    city, state, postal_code = random.choice(
        NIGERIAN_LOCATIONS
    )

    return {
        "street": fake.street_address(),
        "city": city,
        "state": state,
        "country": "Nigeria",
        "postal_code": postal_code,
    }


def generate_customers() :
    customers = []
    used_emails = set()

    for customer_id in range(1, CUSTOMER_COUNT + 1):
        first_name = fake.first_name()
        last_name = fake.last_name()

        email_name = (
            f"{first_name}.{last_name}.{customer_id}"
            .lower()
            .replace(" ", "")
            .replace("'", "")
        )

        email = f"{email_name}@example.com"

        while email in used_emails:
            email = (
                f"{email_name}{random.randint(10, 99)}"
                "@example.com"
            )

        used_emails.add(email)

        customers.append(
            {
                "id": customer_id,
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": generate_phone_number(),
                "created_at": iso_datetime(),
                "address": generate_address(),
            }
        )

    return customers


def generate_products():
    products = []

    for product_id, product_data in enumerate(
        PRODUCTS,
        start=1,
    ):
        name, category, base_price = product_data

        products.append(
            {
                "id": product_id,
                "name": name,
                "description": (
                    f"Quality {name.lower()} available "
                    f"from the G-Watch demo store."
                ),
                "category": category,
                "price": round(base_price, 2),
                "stock": random.randint(0, 150),
                "created_at": iso_datetime(),
            }
        )

    return products


def generate_orders(
    customers: list[dict],
    products: list[dict],):
    orders = []


    order_statuses = [
        "PENDING",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
    ]

    for order_id in range(1, ORDER_COUNT + 1):
        customer = random.choice(customers)

        selected_products = random.sample(
            products,
            k=random.randint(1, 5),
        )

        items = []

        for product in selected_products:
            quantity = random.randint(1, 4)
            unit_price = float(product["price"])
            subtotal = round(quantity * unit_price, 2)

            items.append(
                {
                    "product_id": product["id"],
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "subtotal": subtotal,
                }
            )

        total_amount = round(
            sum(item["subtotal"] for item in items),
            2,
        )

        orders.append(
            {
                "id": order_id,
                "customer_id": customer["id"],
                "items": items,
                "total_amount": total_amount,
                "status": random.choice(order_statuses),
                "shipping_address": deepcopy(
                    customer["address"]
                ),
                "created_at": iso_datetime(),
            }
        )

    return orders


def generate_payments(
    orders: list[dict],
):
    selected_orders = random.sample(
        orders,
        k=PAYMENT_COUNT,
    )

    payment_methods = [
        "CARD",
        "BANK_TRANSFER",
        "USSD",
        "WALLET",
    ]

    payment_statuses = [
        "SUCCESSFUL",
        "PENDING",
        "FAILED",
        "REFUNDED",
    ]

    payments = []

    for payment_id, order in enumerate(
        selected_orders,
        start=1,
    ):
        payments.append(
            {
                "id": payment_id,
                "order_id": order["id"],
                "customer_id": order["customer_id"],
                "amount": order["total_amount"],
                "payment_method": random.choice(
                    payment_methods
                ),
                "status": random.choice(
                    payment_statuses
                ),
                "transaction_reference": (
                    f"PAY-2026-{payment_id:06d}"
                ),
                "created_at": iso_datetime(),
            }
        )

    return payments


def seed_data() -> None:
    customers = generate_customers()
    products = generate_products()
    orders = generate_orders(
        customers=customers,
        products=products,
    )
    payments = generate_payments(orders=orders)

    write_records("customers.json", customers)
    write_records("products.json", products)
    write_records("orders.json", orders)
    write_records("payments.json", payments)

    print("E-commerce data generated successfully")
    print(f"Customers: {len(customers)}")
    print(f"Products: {len(products)}")
    print(f"Orders: {len(orders)}")
    print(f"Payments: {len(payments)}")


if __name__ == "__main__":
    seed_data()
