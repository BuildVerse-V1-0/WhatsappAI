from dataclasses import dataclass


@dataclass
class Customer:
    customer_id: str
    name: str
    phone: str


@dataclass
class Payment:
    payment_id: str
    customer_id: str
    amount: float
    status: str  # "paid" or "unpaid"
