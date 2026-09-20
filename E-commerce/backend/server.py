from __future__ import annotations


import uvicorn
from fastapi import FastAPI

from routes import customers
from routes import orders
from routes import payments
from routes import products


app = FastAPI(
    title="G-Watch E-commerce API",
    description=(
        "A simple synthetic e-commerce REST API protected "
        "and monitored by the G-Watch gateway."
    ),
    version="1.0.0",
)


app.include_router(customers.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(payments.router)


@app.get("/")
def root():
    return {
        "service": "G-Watch E-commerce API",
        "status": "running",
        "documentation": "/docs",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ecommerce-api",
        "port": 4000,
    }


if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=4000,
        reload=True,
    )
