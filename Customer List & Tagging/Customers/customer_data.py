import json
from pathlib import Path
import sys
from typing import Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from common.models import Customer

DATA_FILE = Path(__file__).resolve().parent / "customers.json"


def _load_data() -> List[Dict]:
    if not DATA_FILE.exists():
        return []
    with DATA_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_data(customers: List[Dict]) -> None:
    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(customers, f, indent=4)


def _normalize_customer_id(customer_id) -> str:
    return str(customer_id)


def add_customer(name: str, phone: str) -> Optional[Dict]:
    customers = _load_data()

    # Duplicate phone check
    for c in customers:
        if c["phone"] == phone:
            print("Customer with this phone already exists")
            return None

    customer_id = str(len(customers) + 1)
    customer = {
        "customer_id": customer_id,
        "name": name,
        "phone": phone
    }

    customers.append(customer)
    _save_data(customers)
    print(f"Customer added: {customer}")
    return customer


def get_customer(customer_id) -> Optional[Dict]:
    customers = _load_data()
    target_id = _normalize_customer_id(customer_id)
    for c in customers:
        if _normalize_customer_id(c.get("customer_id")) == target_id:
            return c
    return None


def list_customers() -> List[Dict]:
    return _load_data()


def delete_customer(customer_id) -> bool:
    customers = _load_data()
    target_id = _normalize_customer_id(customer_id)
    updated = [
        c for c in customers if _normalize_customer_id(c.get("customer_id")) != target_id
    ]

    if len(updated) == len(customers):
        print("Customer not found")
        return False

    _save_data(updated)
    print(f"Customer {customer_id} deleted")
    return True


def list_customer_models() -> List[Customer]:
    return [
        Customer(
            customer_id=_normalize_customer_id(c.get("customer_id")),
            name=str(c.get("name", "")),
            phone=str(c.get("phone", "")),
        )
        for c in _load_data()
    ]