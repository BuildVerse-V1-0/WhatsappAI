from enum import Enum
from typing import List
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from common.models import Customer, Payment

class CustomerTag(Enum):
    """
    Initial Tag Library for the WhatsApp Assistant.
    Using Enums ensures consistency across the codebase.
    """
    NEW_CUSTOMER = "new_customer"
    REPEAT_CUSTOMER = "repeat_customer"
    UNPAID_CUSTOMER = "unpaid_customer"
    INACTIVE_CUSTOMER = "inactive_customer"
    NO_OFFERS = "no_offers"



INACTIVE_DAYS = 90


class TaggingService:
    def __init__(self, history_file: str | None = None):
        default_history = Path(__file__).resolve().parent / "tag_history.json"
        self.history_file = Path(history_file) if history_file else default_history

    def _log_transaction(self, customer_id, tag):
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "customer_id": customer_id,
            "tag": tag.value
        }
        self.history_file.parent.mkdir(parents=True, exist_ok=True)
        with self.history_file.open('a', encoding='utf-8') as f:
            json.dump(log_entry, f)
            f.write('\n')

    def tag_customer(self, customer: Customer, payments: List[Payment], no_offers: bool = False):
        tags = set()

        if no_offers:
            tags.add(CustomerTag.NO_OFFERS)

        if len(payments) == 0:
            tags.add(CustomerTag.NEW_CUSTOMER)
        else:
            if len(payments) > 1:
                tags.add(CustomerTag.REPEAT_CUSTOMER)

            has_unpaid = any(p.status == "unpaid" for p in payments)
            if has_unpaid:
                tags.add(CustomerTag.UNPAID_CUSTOMER)

            all_paid = not has_unpaid
            if all_paid:
                now = datetime.now()
                latest = max(
                    p.payment_date.replace(tzinfo=None) if p.payment_date.tzinfo else p.payment_date
                    for p in payments
                )
                if (now - latest).days > INACTIVE_DAYS:
                    tags.add(CustomerTag.INACTIVE_CUSTOMER)

        for tag in tags:
            self._log_transaction(customer.customer_id, tag)

        return tags


if __name__ == "__main__":
    from datetime import timedelta

    tagger = TaggingService()

    # Repeat customer with an unpaid invoice
    customer = Customer("1", "Rahul", "919876543210")
    payments = [
        Payment("101", "1", 500.0, "paid", datetime.now() - timedelta(days=10)),
        Payment("102", "1", 300.0, "unpaid", datetime.now() - timedelta(days=5)),
    ]
    rahul_tags = tagger.tag_customer(customer, payments)
    print(f"Customer: {customer.name}, Tags: {[tag.value for tag in rahul_tags]}")

    # Inactive customer — all paid but last payment was 120 days ago
    inactive_customer = Customer("2", "Priya", "919876543211")
    inactive_payments = [
        Payment("201", "2", 400.0, "paid", datetime.now() - timedelta(days=120)),
    ]
    priya_tags = tagger.tag_customer(inactive_customer, inactive_payments)
    print(f"Customer: {inactive_customer.name}, Tags: {[tag.value for tag in priya_tags]}")

    # New customer — no payments
    new_customer = Customer("3", "Meera", "919876543212")
    meera_tags = tagger.tag_customer(new_customer, [])
    print(f"Customer: {new_customer.name}, Tags: {[tag.value for tag in meera_tags]}")

    # Customer opted out of offers
    opted_out = Customer("4", "Sneha", "919876543213")
    sneha_payments = [Payment("301", "4", 200.0, "paid", datetime.now() - timedelta(days=5))]
    sneha_tags = tagger.tag_customer(opted_out, sneha_payments, no_offers=True)
    print(f"Customer: {opted_out.name}, Tags: {[tag.value for tag in sneha_tags]}")