from enum import Enum
from typing import List
from datetime import datetime
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

    def tag_customer(self, customer: Customer, payments: List[Payment]):
        tags = set()
        
        if len(payments) > 1:
            tags.add(CustomerTag.REPEAT_CUSTOMER)
        
        has_unpaid = any(p.status == "unpaid" for p in payments)
        if has_unpaid:
            tags.add(CustomerTag.UNPAID_CUSTOMER)
            
        if len(payments) == 0:
            tags.add(CustomerTag.NEW_CUSTOMER)

        for tag in tags:
            self._log_transaction(customer.customer_id, tag)
            
        return tags


if __name__ == "__main__":
    customer = Customer("1", "Rahul", "919876543210")
    payments = [
        Payment("101", "1", 500.0, "paid"),
        Payment("102", "1", 300.0, "unpaid"),
    ]

    tagger = TaggingService()
    rahul_tags = tagger.tag_customer(customer, payments)
    print(f"Customer: {customer.name}, Tags: {[tag.value for tag in rahul_tags]}")