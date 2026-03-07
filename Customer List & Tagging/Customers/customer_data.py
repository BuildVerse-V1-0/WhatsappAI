import json
import os

DATA_FILE = "customers.json"


def _load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        return json.load(f)


def _save_data(customers):
    with open(DATA_FILE, "w") as f:
        json.dump(customers, f, indent=4)


def add_customer(name, phone):
    customers = _load_data()

    # Duplicate phone check
    for c in customers:
        if c["phone"] == phone:
            print("Customer with this phone already exists")
            return None

    customer_id = len(customers) + 1
    customer = {
        "customer_id": customer_id,
        "name": name,
        "phone": phone
    }

    customers.append(customer)
    _save_data(customers)
    print(f"Customer added: {customer}")
    return customer


def get_customer(customer_id):
    customers = _load_data()
    for c in customers:
        if c["customer_id"] == customer_id:
            return c
    return None


def list_customers():
    return _load_data()


def delete_customer(customer_id):
    customers = _load_data()
    updated = [c for c in customers if c["customer_id"] != customer_id]

    if len(updated) == len(customers):
        print("Customer not found")
        return False

    _save_data(updated)
    print(f"Customer {customer_id} deleted")
    return True