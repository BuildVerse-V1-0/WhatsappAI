import json
import os
import uuid
import sys
from pathlib import Path
from typing import Dict, List

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from common.models import Payment


PAYMENTS_FILE = os.path.join(
    os.path.dirname(__file__),
    "payments.json",
)


def _load_payments() -> List[Dict]:

    if not os.path.exists(PAYMENTS_FILE):
        return []

    try:
        with open(PAYMENTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        return []

    if not isinstance(data, list):
        return []

    return data


def _save_payments(payments: List[Dict]) -> None:
    
    with open(PAYMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(payments, f, indent=2)


def add_payment(customer_id: str, amount: float) -> Dict:

    customer_id = str(customer_id)

    payments = _load_payments()

    for p in payments:
        if p.get("customer_id") == customer_id and p.get("status") == "unpaid":

            return p

    new_payment = {
        "payment_id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "amount": float(amount),
        "status": "unpaid",
    }

    payments.append(new_payment)
    _save_payments(payments)
    return new_payment


def get_payments_by_customer(customer_id: str) -> List[Dict]:
    customer_id = str(customer_id)
    payments = _load_payments()
    return [p for p in payments if str(p.get("customer_id")) == customer_id]


def get_unpaid_payments() -> List[Dict]:

    payments = _load_payments()
    return [p for p in payments if p.get("status") == "unpaid"]


def get_unpaid_payment_models() -> List[Payment]:
    return [
        Payment(
            payment_id=str(p.get("payment_id", "")),
            customer_id=str(p.get("customer_id", "")),
            amount=float(p.get("amount", 0.0)),
            status=str(p.get("status", "")),
        )
        for p in get_unpaid_payments()
    ]


def mark_payment_paid(payment_id: str) -> bool:

    payments = _load_payments()
    updated = False

    for p in payments:
        if p.get("payment_id") == payment_id:
            p["status"] = "paid"
            updated = True
            break

    if updated:
        _save_payments(payments)

    return updated


if __name__ == "__main__":

    # p = add_payment("test_customer", 100.0)
    # print("Added payment:", p)
    # print("Unpaid payments:", get_unpaid_payments())

    print(_load_payments())


