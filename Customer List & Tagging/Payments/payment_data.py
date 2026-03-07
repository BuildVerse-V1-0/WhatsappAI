import json
import os
import uuid
from typing import List, Dict


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


def get_unpaid_payments() -> List[Dict]:

    payments = _load_payments()
    return [p for p in payments if p.get("status") == "unpaid"]


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

    p = add_payment("test_customer", 100.0)
    print("Added payment:", p)
    print("Unpaid payments:", get_unpaid_payments())


