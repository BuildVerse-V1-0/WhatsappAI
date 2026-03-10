from dataclasses import dataclass, field
from datetime import datetime


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
    payment_date: datetime = field(default_factory=datetime.now)
