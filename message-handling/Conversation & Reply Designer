import random
# WHATSAPP BOT - REPLY TEMPLATE LIBRARY
reply_templates = {

    # Greeting Messages
    "GREETING": [
        "Hi 👋 Welcome! How can I assist you today?",
        "Hello 😊 Thanks for reaching out. How can I help you?",
        "Hey there! What can I do for you today?"
    ],

    # Order Related
    "ORDER": [
        "Sure 😊 Which product would you like to order?",
        "Please tell me the product name so I can assist you.",
        "I'd be happy to help you place an order. What would you like?"
    ],

    # Price Queries
    "PRICE_QUERY": [
        "Please tell me the product name so I can share the price.",
        "Which product's price would you like to know?",
        "Let me know the product and I’ll provide the pricing details."
    ],

    # Payment
    "PAYMENT": [
        "We accept UPI, debit/credit cards, and net banking.",
        "You can pay using UPI or card. I can share the payment link.",
        "Payment options include UPI and cards. Let me know if you'd like the link."
    ],

    # Help / Support
    "HELP": [
        "I’m here to help 😊 Please tell me your concern.",
        "Sure 👍 Could you explain your issue in a bit more detail?",
        "No worries! Let me know how I can assist you."
    ],

    # Order Confirmation
    "ORDER_CONFIRM": [
        "✅ Your order has been successfully placed!",
        "🎉 Order confirmed! You’ll receive updates shortly.",
        "Thank you! Your order is now confirmed."
    ],

    # Payment Confirmation
    "PAYMENT_CONFIRM": [
        "✅ Payment received successfully!",
        "Thank you! Your payment has been confirmed.",
        "Payment successful 👍 Your order is being processed."
    ],

    # Fallback
    "FALLBACK": [
        "I’m sorry, I didn’t fully understand that. Could you please clarify?",
        "Could you provide a little more detail so I can help you better?",
        "I’m not sure I understood. Can you please explain again?"
    ]
}
# FUNCTION TO GET RANDOM REPLY
def get_reply(intent):
    if intent in reply_templates:
        return random.choice(reply_templates[intent])
    else:
        return random.choice(reply_templates["FALLBACK"])
    
# TESTING SYSTEM 
if __name__ == "__main__":

    print("Available Intents:")
    for intent in reply_templates:
        print("-", intent)

    print("\nTesting Replies:\n")

    for intent in reply_templates:
        print("Intent:", intent)
        print("Reply:", get_reply(intent))
        print("-" * 40)
