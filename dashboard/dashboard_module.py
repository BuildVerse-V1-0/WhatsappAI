import os
import json
import logging
from typing import Dict, Any, Tuple
from dotenv import load_dotenv

# Set up logging for module
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from supabase import create_client, Client
except ImportError:
    logger.warning("Supabase Python SDK not installed. Please install using: pip install supabase")

class DashboardModule:
    """
    Customer Summary Dashboard Module
    Handles data fetching, metrics calculation, and image uploads from Supabase.
    """
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        load_dotenv()
        self.url = supabase_url or os.environ.get("SUPABASE_URL")
        self.key = supabase_key or os.environ.get("SUPABASE_KEY")
        
        if not self.url or not self.key:
            logger.error("Supabase URL and Key are required. Set them in .env file or pass them to the constructor.")
            self.supabase = None
        else:
            try:
                self.supabase: Client = create_client(self.url, self.key)
                logger.info("Supabase client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                self.supabase = None

    def fetch_data(self) -> Tuple[list, list]:
        """Fetches customers and payments data from Supabase."""
        if not self.supabase:
            return [], []
            
        try:
            customers_res = self.supabase.table("customers").select("*").execute()
            payments_res = self.supabase.table("payments").select("*").execute()
            return customers_res.data, payments_res.data
        except Exception as e:
            logger.error(f"Error fetching data from Supabase: {e}")
            return [], []

    def calculate_summary(self, customers: list, payments: list) -> Dict[str, Any]:
        """Processes customer and payment data to generate key metrics."""
        total_customers = len(customers)
        if total_customers == 0:
            return self._empty_summary()

        # Structure for processing customer behavior based on payments
        customer_payments = {}
        total_pending_amount = 0.0
        customers_with_pending = set()

        for payment in payments:
            cid = payment.get("customer_id")
            amount = float(payment.get("amount", 0))
            status = payment.get("status", "").lower()

            if cid not in customer_payments:
                customer_payments[cid] = {"count": 0, "total_paid": 0.0, "pending_amount": 0.0}

            customer_payments[cid]["count"] += 1

            if status == "unpaid":
                customer_payments[cid]["pending_amount"] += amount
                total_pending_amount += amount
                customers_with_pending.add(cid)
            elif status == "paid":
                customer_payments[cid]["total_paid"] += amount

        repeat_customers = 0
        new_customers = 0
        inactive_customers = 0

        # Segmenting customers based on logic
        for customer in customers:
            cid = customer.get("customer_id")
            stats = customer_payments.get(cid)

            if not stats:
                # No payments -> Inactive
                inactive_customers += 1
            elif stats["count"] == 1:
                # 1 payment -> New Customer
                new_customers += 1
            elif stats["count"] > 1:
                # >1 payments -> Repeat Customer
                repeat_customers += 1

        repeat_percentage = (repeat_customers / total_customers * 100) if total_customers > 0 else 0

        summary = {
            "total_customers": total_customers,
            "repeat_customers": repeat_customers,
            "new_customers": new_customers,
            "pending_payments": len(customers_with_pending),
            "inactive_customers": inactive_customers,
            "repeat_percentage": f"{repeat_percentage:.1f}%",
            "total_pending_amount": total_pending_amount
        }

        return summary

    def generate_json_report(self, output_file: str = "customer_summary.json") -> Dict[str, Any]:
        """Fetches data, calculates summary, and exports to a JSON file."""
        customers, payments = self.fetch_data()
        summary = self.calculate_summary(customers, payments)

        try:
            with open(output_file, "w") as f:
                json.dump(summary, f, indent=4)
            logger.info(f"Summary successfully exported to {output_file}")
        except Exception as e:
            logger.error(f"Failed to write summary to JSON: {e}")

        return summary

    def upload_shop_image(self, file_path: str, bucket_name: str = "shop-images") -> str:
        """Uploads a shop image to Supabase Storage and returns the public URL."""
        if not self.supabase:
            logger.error("Supabase client is not initialized.")
            return ""

        if not os.path.exists(file_path):
            logger.error(f"Image file not found: {file_path}")
            return ""

        file_name = os.path.basename(file_path)
        try:
            with open(file_path, "rb") as f:
                # Using standard file upload for Supabase Storage
                content_type = "image/jpeg" if file_path.lower().endswith((".jpg", ".jpeg")) else "image/png"
                res = self.supabase.storage.from_(bucket_name).upload(
                    file_name, 
                    f.read(), 
                    {"content-type": content_type}
                )
            
            # Fetch and return public URL after a successful upload
            public_url = self.supabase.storage.from_(bucket_name).get_public_url(file_name)
            logger.info(f"Image uploaded successfully. Public URL: {public_url}")
            return public_url
            
        except Exception as e:
            logger.error(f"Error uploading image to Supabase Storage: {e}")
            return ""

    def _empty_summary(self) -> Dict[str, Any]:
        """Returns empty summary when no customers are found."""
        return {
            "total_customers": 0,
            "repeat_customers": 0,
            "new_customers": 0,
            "pending_payments": 0,
            "inactive_customers": 0,
            "repeat_percentage": "0.0%",
            "total_pending_amount": 0.0
        }

# =========================================================
# Testing the Module (Mock Data vs Real Supabase)
# =========================================================
if __name__ == "__main__":
    dashboard = DashboardModule()

    # NOTE: To test with REAL data, uncomment the following lines and set your `.env` variables
    # metrics = dashboard.generate_json_report()
    # print(json.dumps(metrics, indent=4))
    
    # image_url = dashboard.upload_shop_image("shop.jpg")
    # print(f"Uploaded Image URL: {image_url}")

    # ===============================
    # Example Output with Mock Data
    # ===============================
    print("--- Running Example Output with Mock Data ---")
    mock_customers = [
        {"customer_id": 1, "name": "Alice"},
        {"customer_id": 2, "name": "Bob"},
        {"customer_id": 3, "name": "Charlie"},
        {"customer_id": 4, "name": "Dave"},
        {"customer_id": 5, "name": "Eve"}
    ]
    mock_payments = [
        {"payment_id": 101, "customer_id": 1, "amount": 500, "status": "paid"},
        {"payment_id": 102, "customer_id": 1, "amount": 200, "status": "unpaid"},
        {"payment_id": 103, "customer_id": 2, "amount": 100, "status": "paid"},
        {"payment_id": 104, "customer_id": 4, "amount": 300, "status": "unpaid"}
    ]
    
    example_summary = dashboard.calculate_summary(mock_customers, mock_payments)
    print(json.dumps(example_summary, indent=4))
