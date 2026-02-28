from dataclasses import dataclass
from typing import List

@dataclass
class Payment:
    payment_id: int
    customer_id: int
    amount: float
    status: str  # "paid" or "unpaid" (Matches Monarch's task)

@dataclass
class Customer:
    customer_id: int
    name: str
    phone: str