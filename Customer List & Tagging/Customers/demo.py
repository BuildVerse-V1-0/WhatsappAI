from customer_data import add_customer, get_customer, list_customers

add_customer("Rahul Sharma", "9876543210")
add_customer("Anita Verma", "9123456789")

# Duplicate test
add_customer("Fake Rahul", "9876543210")

print("\nAll Customers:")
for c in list_customers():
    print(c)

print("\nFetch Customer 1:")
print(get_customer("1"))