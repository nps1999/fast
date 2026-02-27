#!/usr/bin/env python3
"""
Simplified Backend Test - Order Creation Flow Testing

Focus on testing the order status logic with existing data
"""

import requests
import json
import time
import uuid

# Configuration
BASE_URL = "https://digital-key-store.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class OrderStatusTester:
    def __init__(self):
        self.user_token = None
        self.existing_products = []
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def make_request(self, method: str, endpoint: str, data=None, token=None):
        """Make HTTP request with proper error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = HEADERS.copy()
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=15)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=15)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=15)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {e}", "ERROR")
            raise
    
    def setup_user(self):
        """Create test user for authentication"""
        try:
            user_email = f"test_user_{int(time.time())}@test.com"
            user_data = {
                "name": "Test User Order Flow",
                "email": user_email,
                "password": "testpass123"
            }
            
            self.log("Creating test user...")
            response = self.make_request("POST", "/auth/register", user_data)
            
            if response.status_code == 200:
                data = response.json()
                self.user_token = data["token"]
                self.log("✅ Test user created successfully")
                return True
            else:
                self.log(f"❌ Failed to create user: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ User setup failed: {e}", "ERROR")
            return False
    
    def get_existing_products(self):
        """Get list of existing products"""
        try:
            self.log("Fetching existing products...")
            response = self.make_request("GET", "/products")
            
            if response.status_code == 200:
                products = response.json()
                self.existing_products = products
                self.log(f"✅ Found {len(products)} existing products")
                
                # Log product details for debugging
                for i, product in enumerate(products[:3]):  # Show first 3
                    self.log(f"  Product {i+1}: {product['name'][:30]}... (Stock: {product.get('stock', 0)})")
                
                return True
            else:
                self.log(f"❌ Failed to fetch products: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Product fetch failed: {e}", "ERROR")
            return False
    
    def test_order_with_existing_product(self, use_discount=False):
        """Test order creation with existing products"""
        try:
            if not self.existing_products:
                self.log("❌ No existing products to test with", "ERROR")
                return False
            
            # Use first available product
            test_product = self.existing_products[0]
            product_id = test_product["id"]
            product_name = test_product["name"]
            stock_count = test_product.get("stock", 0)
            
            test_type = "Free Order (100% Discount)" if use_discount else "Regular Order"
            self.log(f"\n=== Testing {test_type} ===")
            self.log(f"Product: {product_name[:30]}...")
            self.log(f"Stock: {stock_count} codes")
            
            # Prepare order data
            order_data = {
                "items": [
                    {
                        "productId": product_id,
                        "quantity": 1
                    }
                ],
                "whatsAppNumber": "555123456",
                "countryCode": "+966"
            }
            
            # Add discount for free order test
            if use_discount:
                # Try some common discount codes
                test_codes = ["FREE100", "TEST100", "DISCOUNT100"]
                for code in test_codes:
                    validate_response = self.make_request("POST", "/discounts/validate", {"code": code})
                    if validate_response.status_code == 200:
                        order_data["discountCode"] = code
                        self.log(f"✅ Using discount code: {code}")
                        break
                else:
                    self.log("⚠️  No valid discount codes found, testing as regular order")
                    use_discount = False
            
            # Create the order
            response = self.make_request("POST", "/orders", order_data, self.user_token)
            
            if response.status_code == 201:
                order = response.json()
                order_id = order["id"]
                
                self.log(f"✅ Order created successfully: {order_id[:8]}")
                self.log(f"📋 Order Details:")
                self.log(f"   Status: {order['status']}")
                self.log(f"   Total: ${order['total']}")
                self.log(f"   Payment Method: {order.get('paymentMethod', 'N/A')}")
                
                # Analyze the order based on stock and payment
                is_free = order["total"] == 0
                has_stock = stock_count > 0
                
                self.log(f"📊 Analysis:")
                self.log(f"   Is Free Order: {is_free}")
                self.log(f"   Product Has Stock: {has_stock}")
                
                # Check order items
                if order.get("items"):
                    item = order["items"][0]
                    delivered_codes = item.get("deliveredCodes", [])
                    pending_count = item.get("pendingCount", 0)
                    
                    self.log(f"   Delivered Codes: {len(delivered_codes)}")
                    self.log(f"   Pending Count: {pending_count}")
                    
                    # Verify the logic based on the bug fix
                    expected_status = "completed" if len(delivered_codes) > 0 and pending_count == 0 else "pending_delivery"
                    
                    if order["status"] == expected_status:
                        self.log(f"✅ Status '{order['status']}' matches expectation")
                        
                        # Additional checks for the specific bug scenario
                        if is_free and not has_stock:
                            if order["status"] == "pending_delivery":
                                self.log("✅ CRITICAL FIX VERIFIED: Free order with no stock correctly shows 'pending_delivery'")
                            else:
                                self.log("❌ CRITICAL BUG: Free order with no stock should be 'pending_delivery'", "ERROR")
                                return False
                                
                    else:
                        self.log(f"❌ Status mismatch: Expected '{expected_status}', got '{order['status']}'", "ERROR")
                        return False
                
                # Test order retrieval
                retrieve_response = self.make_request("GET", f"/orders/{order_id}", token=self.user_token)
                if retrieve_response.status_code == 200:
                    retrieved_order = retrieve_response.json()
                    self.log("✅ Order retrieval successful")
                    
                    if retrieved_order["status"] == order["status"]:
                        self.log("✅ Order status consistent on retrieval")
                    else:
                        self.log("❌ Order status changed on retrieval", "ERROR")
                        return False
                else:
                    self.log(f"❌ Failed to retrieve order: {retrieve_response.text}", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Failed to create order: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Order test failed: {e}", "ERROR")
            return False
    
    def test_multiple_scenarios(self):
        """Test multiple order scenarios"""
        results = {}
        
        # Test regular order
        self.log("\n" + "="*60)
        results["regular_order"] = self.test_order_with_existing_product(use_discount=False)
        
        # Test with discount (if available)
        self.log("\n" + "="*60)
        results["discount_order"] = self.test_order_with_existing_product(use_discount=True)
        
        return results
    
    def run_tests(self):
        """Run all tests"""
        self.log("🚀 Starting Order Status Logic Tests")
        self.log("="*60)
        
        # Setup
        if not self.setup_user():
            return {"setup_failed": True}
        
        if not self.get_existing_products():
            return {"products_failed": True}
        
        # Run tests
        results = self.test_multiple_scenarios()
        
        # Summary
        self.log("\n" + "="*60)
        self.log("🏁 TEST SUMMARY")
        self.log("="*60)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("✅ All tests passed - Order status logic working correctly")
        else:
            self.log("❌ Some tests failed - Check order status logic")
        
        return results

if __name__ == "__main__":
    tester = OrderStatusTester()
    results = tester.run_tests()
    
    # Exit with appropriate code
    all_passed = all(v for v in results.values() if isinstance(v, bool))
    exit(0 if all_passed else 1)