import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from dotenv import load_dotenv


_SEGMENTATION_DIR = Path(__file__).resolve().parents[1] / "Customer List & Tagging" / "Segmentation"
if str(_SEGMENTATION_DIR) not in sys.path:
    sys.path.insert(0, str(_SEGMENTATION_DIR))

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

try:
    from supabase import create_client, Client
except ImportError:
    logger.warning("Supabase Python SDK not installed. Run: pip install supabase")

from segmentation import SegmentationService
from tagging import CustomerTag  # noqa: E402


# ─── Helpers ──────────────────────────────────────────────────────────────────

class SimpleCustomer:
    """Lightweight customer object consumed by SegmentationService."""
    def __init__(self, customer_id: str, name: str, phone: str):
        self.customer_id = customer_id
        self.name = name
        self.phone = phone


def _cents_to_currency(cents: int) -> float:
    """Convert integer paise/cents to a 2-decimal float (₹)."""
    return round(cents / 100, 2)


# ─── Tag resolution ───────────────────────────────────────────────────────────
# app_customers.tag stores a single primary tag written by the tagging module.
# We map those stored strings to CustomerTag members so we can reuse
# SegmentationService without touching its internals.

_TAG_MAP: Dict[str, "CustomerTag"] = {}   # populated lazily after import


def _resolve_stored_tag(raw_tag: Optional[str]) -> Optional["CustomerTag"]:
    """Return the CustomerTag enum member for a stored tag string, or None."""
    if not raw_tag:
        return None
    if not _TAG_MAP:
        # Build the map once from the enum itself so it stays in sync.
        for member in CustomerTag:
            _TAG_MAP[member.value.lower()] = member
            _TAG_MAP[member.name.lower()] = member
    return _TAG_MAP.get(raw_tag.strip().lower())


# ─── DashboardModule ──────────────────────────────────────────────────────────

class DashboardModule:
    """
    Customer Summary Dashboard Module
    ----------------------------------
    Connects to the production Supabase schema:
        • app_customers  — customer master with pre-computed tag / total_orders
        • app_payments   — payment ledger (amounts stored in cents)
        • app_tenants    — business metadata

    All queries are scoped to a single tenant_id so the dashboard is safe
    for multi-tenant deployments.
    """

    def __init__(
        self,
        supabase_url: str = None,
        supabase_key: str = None,
        tenant_id: str = None,
    ):
        load_dotenv()
        self.url = supabase_url or os.environ.get("SUPABASE_URL")
        self.key = supabase_key or os.environ.get("SUPABASE_KEY")
        # tenant_id scopes every query; falls back to TENANT_ID env var.
        self.tenant_id: Optional[str] = tenant_id or os.environ.get("TENANT_ID")

        if not self.url or not self.key:
            logger.error(
                "SUPABASE_URL and SUPABASE_KEY are required. "
                "Set them in .env or pass them to the constructor."
            )
            self.supabase = None
        else:
            try:
                self.supabase: Client = create_client(self.url, self.key)
                logger.info("Supabase client initialised successfully.")
            except Exception as e:
                logger.error(f"Failed to initialise Supabase client: {e}")
                self.supabase = None

        if not self.tenant_id:
            logger.warning(
                "No tenant_id provided. Queries will NOT be tenant-scoped — "
                "this is unsafe in production. Set TENANT_ID in .env."
            )

    # ── Internal: scoped query builder ────────────────────────────────────────

    def _scoped(self, table: str, columns: str = "*"):
        """
        Start a select query on `table`.  If tenant_id is set, add an .eq()
        filter automatically so every fetch is tenant-scoped.
        """
        q = self.supabase.table(table).select(columns)
        if self.tenant_id:
            q = q.eq("tenant_id", self.tenant_id)
        return q

    # ── Public: fetch ──────────────────────────────────────────────────────────

    def fetch_data(self) -> Tuple[list, list]:
        """
        Fetch rows from app_customers and app_payments, both scoped by tenant_id.

        app_customers columns used:
            customer_id, name, phone, tag, total_orders, total_spent_cents,
            last_interaction, preferred_language, created_at

        app_payments columns used:
            payment_id, customer_id, amount_cents, due_date, status,
            reminder_count, created_at
        """
        if not self.supabase:
            return [], []

        try:
            customers_res = self._scoped(
                "app_customers",
                "customer_id, name, phone, tag, total_orders, "
                "total_spent_cents, last_interaction, preferred_language, created_at",
            ).execute()

            payments_res = self._scoped(
                "app_payments",
                "payment_id, customer_id, amount_cents, due_date, "
                "status, reminder_count, created_at",
            ).execute()

            logger.info(
                f"Fetched {len(customers_res.data)} customers and "
                f"{len(payments_res.data)} payments "
                f"(tenant: {self.tenant_id or 'unscoped'})."
            )
            return customers_res.data, payments_res.data

        except Exception as e:
            logger.error(f"Error fetching data from Supabase: {e}")
            return [], []

    def fetch_tenant_info(self) -> Dict[str, Any]:
        """
        Returns basic business metadata from app_tenants for the current tenant.
        Useful for personalising the dashboard header (business_name, etc.).
        """
        if not self.supabase or not self.tenant_id:
            return {}
        try:
            res = (
                self.supabase.table("app_tenants")
                .select("tenant_id, business_name, whatsapp_number, ai_tone")
                .eq("tenant_id", self.tenant_id)
                .single()
                .execute()
            )
            return res.data or {}
        except Exception as e:
            logger.error(f"Error fetching tenant info: {e}")
            return {}

    # ── Public: calculate ─────────────────────────────────────────────────────

    def calculate_summary(self, customers: list, payments: list) -> Dict[str, Any]:
        """
        Derive dashboard metrics from app_customers + app_payments rows.

        Strategy
        --------
        1.  Build a payment index keyed by customer_id and accumulate
            total_pending_amount (converted from amount_cents).
        2.  For each customer, prefer the stored `tag` field (written by the
            tagging module) to determine segment.  Fall back to deriving tags
            from payment history when tag is absent/unrecognised.
        3.  Pass (SimpleCustomer, tags) pairs through SegmentationService —
            the same path as before — to count loyalty / welcome / inactive /
            to_remind_payment segments.
        """
        total_customers = len(customers)
        if total_customers == 0:
            return self._empty_summary()

        # ── Step 1: index payments ─────────────────────────────────────────
        customer_payments: Dict[str, list] = {}
        total_pending_amount = 0.0

        for payment in payments:
            cid = payment.get("customer_id")
            # amount_cents → ₹  (app_payments stores paise)
            amount_rupees = _cents_to_currency(int(payment.get("amount_cents", 0)))
            status = payment.get("status", "").lower()

            customer_payments.setdefault(cid, []).append(payment)

            if status == "unpaid":
                total_pending_amount += amount_rupees

        # ── Step 2: build tagged_customers list ────────────────────────────
        tagged_customers = []

        for customer in customers:
            cid     = customer.get("customer_id")
            name    = customer.get("name", "")
            phone   = customer.get("phone", "")
            raw_tag = customer.get("tag")                   # stored string tag
            total_orders = int(customer.get("total_orders") or 0)

            cust_obj      = SimpleCustomer(cid, name, phone)
            payments_list = customer_payments.get(cid, [])
            tags          = set()

            stored_tag = _resolve_stored_tag(raw_tag)

            if stored_tag:
                # Trust the pre-computed tag from the tagging module.
                tags.add(stored_tag)
            else:
                # Fallback: derive from payment history + total_orders.
                if total_orders == 0 and len(payments_list) == 0:
                    tags.add(CustomerTag.NEW_CUSTOMER)
                    tags.add(CustomerTag.INACTIVE_CUSTOMER)
                if total_orders > 1 or len(payments_list) > 1:
                    tags.add(CustomerTag.REPEAT_CUSTOMER)
                if any(p.get("status", "").lower() == "unpaid" for p in payments_list):
                    tags.add(CustomerTag.UNPAID_CUSTOMER)

            tagged_customers.append((cust_obj, tags))

        # ── Step 3: segment ────────────────────────────────────────────────
        segmentation_service = SegmentationService()
        segments = segmentation_service.segment_customers(tagged_customers)

        repeat_customers   = len(segments["loyalty_list"])
        new_customers      = len(segments["welcome_list"])
        pending_customers  = len(segments["to_remind_payment"])
        inactive_customers = len(segments["inactive_list"])
        repeat_percentage  = (repeat_customers / total_customers * 100) if total_customers else 0

        return {
            "total_customers":      total_customers,
            "repeat_customers":     repeat_customers,
            "new_customers":        new_customers,
            "pending_payments":     pending_customers,
            "inactive_customers":   inactive_customers,
            "repeat_percentage":    f"{repeat_percentage:.1f}%",
            "total_pending_amount": round(total_pending_amount, 2),
        }

    # ── Public: generate report ────────────────────────────────────────────────

    def generate_json_report(self, output_file: str = "customer_summary.json") -> Dict[str, Any]:
        """Fetches live data, calculates summary, and exports to a JSON file."""
        customers, payments = self.fetch_data()
        summary = self.calculate_summary(customers, payments)

        try:
            with open(output_file, "w") as f:
                json.dump(summary, f, indent=4)
            logger.info(f"Summary exported to {output_file}")
        except Exception as e:
            logger.error(f"Failed to write summary JSON: {e}")

        return summary

    # ── Public: upload image ───────────────────────────────────────────────────

    def upload_shop_image(
        self,
        file_path: str,
        bucket_name: str = "shop-images",
    ) -> str:
        """
        Uploads a shop image to Supabase Storage and returns the public URL.

        Storage path structure:
            {tenant_id}/{filename}   — when tenant_id is set (recommended)
            {filename}               — fallback (no tenant isolation)

        Supported formats: JPEG, PNG, WebP, GIF.
        """
        if not self.supabase:
            logger.error("Supabase client is not initialised.")
            return ""

        if not os.path.exists(file_path):
            logger.error(f"Image file not found: {file_path}")
            return ""

        file_name = os.path.basename(file_path)
        ext = file_path.lower().rsplit(".", 1)[-1]
        content_type_map = {
            "jpg":  "image/jpeg",
            "jpeg": "image/jpeg",
            "png":  "image/png",
            "webp": "image/webp",
            "gif":  "image/gif",
        }
        content_type = content_type_map.get(ext, "application/octet-stream")

        # Namespace uploads by tenant so different businesses don't collide.
        storage_path = f"{self.tenant_id}/{file_name}" if self.tenant_id else file_name

        try:
            with open(file_path, "rb") as f:
                self.supabase.storage.from_(bucket_name).upload(
                    storage_path,
                    f.read(),
                    {"content-type": content_type},
                )

            public_url = self.supabase.storage.from_(bucket_name).get_public_url(storage_path)
            logger.info(f"Image uploaded → {public_url}")
            return public_url

        except Exception as e:
            logger.error(f"Error uploading image to Supabase Storage: {e}")
            return ""

    # ── Private ────────────────────────────────────────────────────────────────

    def _empty_summary(self) -> Dict[str, Any]:
        return {
            "total_customers":      0,
            "repeat_customers":     0,
            "new_customers":        0,
            "pending_payments":     0,
            "inactive_customers":   0,
            "repeat_percentage":    "0.0%",
            "total_pending_amount": 0.0,
        }


if __name__ == "__main__":
    dashboard = DashboardModule()

    if dashboard.supabase:
        customers, payments = dashboard.fetch_data()
        summary = dashboard.calculate_summary(customers, payments)
        print(json.dumps(summary, indent=4))

