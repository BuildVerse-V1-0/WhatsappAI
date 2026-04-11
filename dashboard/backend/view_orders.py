import os
from typing import Any, Dict, List, NotRequired, TypedDict, cast

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client


load_dotenv()

app = FastAPI(
	title="Orders API",
	description="Fetch order data from Supabase",
	version="1.0.0",
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


class OrderRecord(TypedDict):
	order_id: int
	created_at: str
	customer_id: str
	tenant_id: str
	payments: NotRequired[List[str]]


class BusinessLinkRequest(BaseModel):
	tenant_id: str
	google_business_id: str


def get_supabase_client() -> Client:
	supabase_url = os.getenv("SUPABASE_URL")
	supabase_key = os.getenv("SUPABASE_KEY")

	if not supabase_url or not supabase_key:
		raise HTTPException(
			status_code=500,
			detail="SUPABASE_URL and SUPABASE_KEY must be set in environment variables or .env",
		)

	return create_client(supabase_url, supabase_key)


@app.get("/health")
def health_check() -> JSONResponse:
	"""Single health endpoint for API and Supabase connectivity."""
	content: Dict[str, Any] = {
		"success": True,
		"status": "ok",
		"api": "up",
		"supabase": {
			"status": "unknown",
			"message": "Not checked",
		},
	}

	status_code = 200

	try:
		supabase = get_supabase_client()
		query_result = (
			supabase
			.schema("public")
			.table("orders")
			.select("order_id")
			.limit(1)
			.execute()
		)
		content["supabase"] = {
			"status": "connected",
			"message": "Supabase connection successful",
			"checked_table": "public.orders",
			"sample_count": len(query_result.data or []),
		}
	except HTTPException as exc:
		status_code = 500
		content["success"] = False
		content["status"] = "degraded"
		content["supabase"] = {
			"status": "misconfigured",
			"message": "Supabase environment variables are missing or invalid",
			"detail": str(exc.detail),
		}
	except Exception as exc:
		status_code = 503
		content["success"] = False
		content["status"] = "degraded"
		content["supabase"] = {
			"status": "unreachable",
			"message": "Failed to connect to Supabase",
			"detail": str(exc),
		}

	return JSONResponse(status_code=status_code, content=content)



@app.get("/orders")
def get_orders(
	limit: int = Query(default=100, ge=1, le=1000),
	tenant_id: str | None = Query(default=None, min_length=1),
) -> JSONResponse:
	"""Fetch rows from public.orders."""
	try:
		supabase = get_supabase_client()
		query = supabase.schema("public").table("orders").select(
			"order_id, created_at, customer_id, tenant_id, payments"
		)

		if tenant_id:
			query = query.eq("tenant_id", tenant_id)

		query_result = query.limit(limit).execute()
		orders = cast(List[OrderRecord], query_result.data or [])
		return JSONResponse(
			status_code=200,
			content={
				"success": True,
				"count": len(orders),
				"tenant_id": tenant_id,
				"orders": orders,
			},
		)
	except HTTPException:
		raise
	except Exception as exc:
		raise HTTPException(
			status_code=500,
			detail=f"Failed to fetch orders from Supabase: {exc}",
		) from exc

#TODO: Check Security of this endpoint, as it allows fetching all payments for a business. Consider adding authentication and authorization checks to ensure only authorized users can access this data.
@app.get("/payments")
def get_payments(
	limit: int = Query(default=100, ge=1, le=1000),
	tenant_id: str | None = Query(default=None, min_length=1)
) -> JSONResponse:
	"""Fetch payments from public.app_payments, optionally filtered by business."""
	try:
		supabase = get_supabase_client()
		query = supabase.schema("public").table("app_payments").select("*")

		if tenant_id:
			query = query.eq("tenant_id", tenant_id)

		query_result = query.limit(limit).execute()
		payments = cast(List[Dict[str, Any]], query_result.data or [])
		return JSONResponse(
			status_code=200,
			content={
				"success": True,
				"count": len(payments),
				"tenant_id": tenant_id,
				"payments": payments,
			},
		)
	except HTTPException:
		raise
	except Exception as exc:
		raise HTTPException(
			status_code=500,
			detail=f"Failed to fetch payments from Supabase: {exc}",
		) from exc

#Test Command: curl -X POST "http://127.0.0.1:8000/business-link" -H "Content-Type: application/json" -d "{\"tenant_id\":\"urbanwear\",\"google_business_id\":\"123456789012345\"}"
@app.post("/business-link")
def store_business_link(request: BusinessLinkRequest) -> JSONResponse:
	"""Store or update the Google Business link for a tenant."""
	try:
		supabase = get_supabase_client()
		
		# Validate that tenant exists
		tenant_check = supabase.schema("public").table("app_tenants").select("tenant_id").eq("tenant_id", request.tenant_id).execute()
		if not tenant_check.data:
			raise HTTPException(
				status_code=404,
				detail=f"Tenant with ID '{request.tenant_id}' not found",
			)
		
		# Update tenant with google_business_id
		update_result = supabase.schema("public").table("app_tenants").update(
			{"google_business_id": request.google_business_id}
		).eq("tenant_id", request.tenant_id).execute()
		
		if not update_result.data:
			raise HTTPException(
				status_code=500,
				detail="Failed to update tenant with business link",
			)
		
		return JSONResponse(
			status_code=200,
			content={
				"success": True,
				"tenant_id": request.tenant_id,
				"google_business_id": request.google_business_id,
				"message": "Business link stored successfully",
			},
		)
	except HTTPException:
		raise
	except Exception as exc:
		raise HTTPException(
			status_code=500,
			detail=f"Failed to store business link: {exc}",
		) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("view_orders:app", port=8000, reload=True)
