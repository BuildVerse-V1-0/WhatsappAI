from pathlib import Path
import tempfile

from Customers import customer_data
from Payments import payment_data
from Segmentation.segmentation import SegmentationService
from Segmentation.tagging import TaggingService
from common.models import Payment


def _to_payment_models(payment_dicts):
    return [
        Payment(
            payment_id=str(p["payment_id"]),
            customer_id=str(p["customer_id"]),
            amount=float(p["amount"]),
            status=str(p["status"]),
        )
        for p in payment_dicts
    ]


def run_demo() -> None:
    # Keep the demo isolated from real project JSON files.
    original_customer_file = customer_data.DATA_FILE
    original_payments_file = payment_data.PAYMENTS_FILE

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        customer_data.DATA_FILE = tmp_path / "customers_demo.json"
        payment_data.PAYMENTS_FILE = str(tmp_path / "payments_demo.json")
        tag_history_file = tmp_path / "tag_history_demo.json"

        # 1) Create demo customers.
        rahul = customer_data.add_customer("Rahul Sharma", "9876543210")
        anita = customer_data.add_customer("Anita Verma", "9123456789")
        meera = customer_data.add_customer("Meera Iyer", "9000000001")

        if rahul is None or anita is None or meera is None:
            raise RuntimeError("Demo setup failed while creating customers")

        # 2) Create demo payments.
        payment_data.add_payment(rahul["customer_id"], 500.0)
        payment_data.add_payment(rahul["customer_id"], 300.0)

        anita_payment = payment_data.add_payment(anita["customer_id"], 250.0)
        payment_data.mark_payment_paid(anita_payment["payment_id"])

        # Meera gets no payment to demonstrate NEW_CUSTOMER tagging.

        # 3) Tag each customer from payment history.
        tagger = TaggingService(history_file=str(tag_history_file))
        tagged_customers = []

        for customer in customer_data.list_customer_models():
            customer_payments = payment_data.get_payments_by_customer(customer.customer_id)
            payment_models = _to_payment_models(customer_payments)
            tags = tagger.tag_customer(customer, payment_models)
            tagged_customers.append((customer, tags))

        # 4) Segment for WhatsApp broadcast lists.
        segments = SegmentationService.segment_customers(tagged_customers)

        # 5) Print a concise integration report.
        print("=== Integrated Demo: Customers + Payments + Segmentation ===")
        print("\nCustomers:")
        for c in customer_data.list_customers():
            print(c)

        print("\nUnpaid Payments:")
        for p in payment_data.get_unpaid_payments():
            print(p)

        print("\nTags Per Customer:")
        for customer, tags in tagged_customers:
            print(f"{customer.name}: {[tag.value for tag in tags]}")

        print("\nSegments:")
        for segment, phones in segments.items():
            print(f"{segment}: {phones}")

        print(f"\nTag history written to: {tag_history_file}")

    # Restore module-level file targets.
    customer_data.DATA_FILE = original_customer_file
    payment_data.PAYMENTS_FILE = original_payments_file


if __name__ == "__main__":
    run_demo()
