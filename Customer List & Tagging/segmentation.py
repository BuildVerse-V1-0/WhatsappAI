from tagging import CustomerTag
import data

class SegmentationService:
    @staticmethod
    def segment_customers(tagged_customers):
        """
        Groups customers into buckets for WhatsApp broadcasts.
        Input: List of tuples [(Customer, {Tags})]
        """
        segments = {
            "to_remind_payment": [],  
            "loyalty_list": [],       
            "welcome_list": []        
        }

        for customer, tags in tagged_customers:
            
            if CustomerTag.UNPAID_CUSTOMER in tags:
                segments["to_remind_payment"].append(customer.phone)
            
            if CustomerTag.REPEAT_CUSTOMER in tags:
                segments["loyalty_list"].append(customer.phone)
                
            if CustomerTag.NEW_CUSTOMER in tags:
                segments["welcome_list"].append(customer.phone)
                
        return segments
    
# Example usage
tagged_customers = [
    (data.Customer(1, "Rahul", "919876543210"), {CustomerTag.REPEAT_CUSTOMER, CustomerTag.UNPAID_CUSTOMER}),
    (data.Customer(2, "Priya", "919876543211"), {CustomerTag.NEW_CUSTOMER}),
    (data.Customer(3, "Amit", "919876543212"), {CustomerTag.REPEAT_CUSTOMER})
]
segmentation_service = SegmentationService()
segments = segmentation_service.segment_customers(tagged_customers)
print("Segments for WhatsApp Broadcasts:")
for segment, phones in segments.items():
    print(f"{segment}: {phones}")
