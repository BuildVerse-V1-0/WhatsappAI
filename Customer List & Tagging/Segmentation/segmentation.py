from pathlib import Path
import sys
from typing import Dict, Iterable, List, Set, Tuple

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    from .tagging import CustomerTag
except ImportError:
    from tagging import CustomerTag
from common.models import Customer

class SegmentationService:
    @staticmethod
    def segment_customers(
        tagged_customers: Iterable[Tuple[Customer, Set[CustomerTag]]],
    ) -> Dict[str, List[str]]:
        """
        Groups customers into buckets for WhatsApp broadcasts.
        Input: List of tuples [(Customer, {Tags})]
        """
        segments = {
            "to_remind_payment": [],   # unpaid customers
            "loyalty_list": [],        # repeat customers
            "welcome_list": [],        # new customers
            "inactive_list": [],       # inactive customers
            "offers_eligible_list": [], # repeat customers with offers enabled
        }

        for customer, tags in tagged_customers:

            if CustomerTag.UNPAID_CUSTOMER in tags:
                segments["to_remind_payment"].append(customer.phone)

            if CustomerTag.REPEAT_CUSTOMER in tags:
                segments["loyalty_list"].append(customer.phone)

            if CustomerTag.NEW_CUSTOMER in tags:
                segments["welcome_list"].append(customer.phone)

            if CustomerTag.INACTIVE_CUSTOMER in tags:
                segments["inactive_list"].append(customer.phone)

            if CustomerTag.REPEAT_CUSTOMER in tags and CustomerTag.NO_OFFERS not in tags:
                segments["offers_eligible_list"].append(customer.phone)

        return segments


if __name__ == "__main__":
    tagged_customers = [
        (
            Customer("1", "Rahul", "919876543210"),
            {CustomerTag.REPEAT_CUSTOMER, CustomerTag.UNPAID_CUSTOMER},
        ),
        (Customer("2", "Priya", "919876543211"), {CustomerTag.NEW_CUSTOMER}),
        (Customer("3", "Amit", "919876543212"), {CustomerTag.REPEAT_CUSTOMER}),
        (Customer("4", "Sneha", "919876543213"), {CustomerTag.REPEAT_CUSTOMER, CustomerTag.NO_OFFERS}),
        (Customer("5", "Vikram", "919876543214"), {CustomerTag.INACTIVE_CUSTOMER}),
    ]
    segmentation_service = SegmentationService()
    segments = segmentation_service.segment_customers(tagged_customers)
    print("Segments for WhatsApp Broadcasts:")
    for segment, phones in segments.items():
        print(f"{segment}: {phones}")
