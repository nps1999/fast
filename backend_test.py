#!/usr/bin/env python3
"""
Backend Testing for Order Creation Flow - Free Orders and Out-of-Stock Products

Test Scenarios:
1. Free Order with Stock Available - Should be 'completed'
2. Free Order with Out-of-Stock Product - Should be 'pending_delivery'  
3. Paid Order with Out-of-Stock Product - Should be 'pending_delivery'
4. Mixed Order (some stock, some out of stock) - Should be 'pending_delivery'
"""

import requests
import json
import time
import uuid
from typing import Dict, Any, List

# Configuration
BASE_URL = "https://digital-key-store.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test credentials
TEST_ADMIN = {
    "name": "Test Admin",
    "email": f"admin_test_{int(time.time())}@test.com",
    "password": "testpass123"
}

TEST_USER = {
    "name": "Test User",
    "email": f"user_test_{int(time.time())}@test.com", 
    "password": "testpass123"
}

class BackendTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.test_category_id = None
        self.test_product_with_stock_id = None
        self.test_product_no_stock_id = None
        self.test_discount_code = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = HEADERS.copy()
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {e}", "ERROR")
            raise
    
    def setup_admin_and_user(self) -> bool:
        """Setup test admin and user accounts"""
        try:
            # Check if admin exists
            response = self.make_request("GET", "/auth/check-admin")
            if response.status_code == 200:
                has_admin = response.json().get("hasAdmin", False)
                
                if not has_admin:
                    # Create admin
                    self.log("Creating test admin...")
                    response = self.make_request("POST", "/auth/setup-admin", TEST_ADMIN)
                    if response.status_code == 200:
                        data = response.json()
                        self.admin_token = data["token"]
                        self.log("✅ Admin created successfully")
                    else:
                        self.log(f"❌ Failed to create admin: {response.text}", "ERROR")
                        return False
                else:
                    # Try to login as existing admin (this will fail, but we'll create a new user as admin)
                    self.log("Admin exists, attempting to create new admin user...")
                    # Create a regular user first, then we'll need to test with that
                    response = self.make_request("POST", "/auth/register", TEST_USER)
                    if response.status_code == 200:
                        data = response.json()
                        self.user_token = data["token"]
                        self.log("✅ Test user created for testing")
                        
                        # We'll use this user token, but we need admin access for some operations
                        # Let's try to create another admin account with different email
                        admin_email = f"admin_test_{int(time.time())}_alt@test.com"
                        try:
                            admin_response = self.make_request("POST", "/auth/setup-admin", {
                                **TEST_ADMIN,
                                "email": admin_email
                            })
                            if admin_response.status_code == 200:
                                self.admin_token = admin_response.json()["token"]
                                self.log("✅ Alternative admin created successfully")
                            else:
                                self.log("⚠️  Could not create admin, will use user token for limited testing")
                                self.admin_token = self.user_token  # Fallback
                        except:
                            self.log("⚠️  Admin creation failed, using user token")
                            self.admin_token = self.user_token  # Fallback
                    else:
                        self.log(f"❌ Failed to create test user: {response.text}", "ERROR")
                        return False
            else:
                self.log(f"❌ Failed to check admin status: {response.text}", "ERROR")
                return False
                
            # Create test user if we don't have one
            if not self.user_token:
                self.log("Creating test user...")
                response = self.make_request("POST", "/auth/register", TEST_USER)
                if response.status_code == 200:
                    data = response.json()
                    self.user_token = data["token"]
                    self.log("✅ Test user created successfully")
                else:
                    self.log(f"❌ Failed to create user: {response.text}", "ERROR")
                    return False
                    
            return True
            
        except Exception as e:
            self.log(f"❌ Setup failed: {e}", "ERROR")
            return False
    
    def create_test_data(self) -> bool:
        """Create test category, products, and discount codes"""
        try:
            # Create test category
            self.log("Creating test category...")
            category_data = {
                "name": f"Test Category {int(time.time())}",
                "active": True
            }
            
            response = self.make_request("POST", "/categories", category_data, self.admin_token)
            if response.status_code == 201:
                self.test_category_id = response.json()["id"]
                self.log("✅ Test category created")
            else:
                self.log(f"⚠️  Failed to create category, will use None: {response.text}")
                self.test_category_id = None
            
            # Create product with stock
            self.log("Creating test product with stock...")
            product_with_stock_data = {
                "name": f"Gaming Card With Stock {int(time.time())}",
                "description": "Test product with available codes",
                "price": 10.00,
                "categoryId": self.test_category_id,
                "active": True
            }
            
            response = self.make_request("POST", "/products", product_with_stock_data, self.admin_token)
            if response.status_code == 201:
                self.test_product_with_stock_id = response.json()["id"]
                self.log("✅ Product with stock created")
                
                # Add some codes for this product
                self.log("Adding codes to product...")
                codes_data = {
                    "productId": self.test_product_with_stock_id,
                    "codes": [
                        f"CODE-{uuid.uuid4().hex[:8].upper()}",
                        f"CODE-{uuid.uuid4().hex[:8].upper()}",
                        f"CODE-{uuid.uuid4().hex[:8].upper()}"
                    ]
                }
                
                codes_response = self.make_request("POST", "/codes", codes_data, self.admin_token)
                if codes_response.status_code == 201:
                    self.log(f"✅ Added {codes_response.json()['added']} codes to product")
                else:
                    self.log(f"⚠️  Failed to add codes: {codes_response.text}")
            else:
                self.log(f"❌ Failed to create product with stock: {response.text}", "ERROR")
                return False
            
            # Create product without stock (out-of-stock)
            self.log("Creating test product without stock...")
            product_no_stock_data = {
                "name": f"Gaming Card No Stock {int(time.time())}",
                "description": "Test product with no available codes",
                "price": 15.00,
                "categoryId": self.test_category_id,
                "active": True
            }
            
            response = self.make_request("POST", "/products", product_no_stock_data, self.admin_token)
            if response.status_code == 201:
                self.test_product_no_stock_id = response.json()["id"]
                self.log("✅ Product without stock created (no codes added)")
            else:
                self.log(f"❌ Failed to create product without stock: {response.text}", "ERROR")
                return False
            
            # Create 100% discount code for free orders
            self.log("Creating 100% discount code...")
            discount_code = f"FREE100_{int(time.time())}"
            discount_data = {
                "code": discount_code,
                "type": "percentage",
                "value": 100,  # 100% discount
                "minOrder": 0,
                "active": True
            }
            
            response = self.make_request("POST", "/discounts", discount_data, self.admin_token)
            if response.status_code == 201:
                self.test_discount_code = discount_code
                self.log("✅ 100% discount code created")
            else:
                self.log(f"⚠️  Failed to create discount code, will test without: {response.text}")
                
            return True
            
        except Exception as e:
            self.log(f"❌ Test data creation failed: {e}", "ERROR")
            return False
    
    def test_free_order_with_stock(self) -> bool:
        """Test Scenario 1: Free Order with Stock Available - Should be 'completed'"""
        self.log("\n=== TEST 1: Free Order with Stock Available ===")
        
        try:
            # Create order with product that has stock + 100% discount
            order_data = {
                "items": [
                    {
                        "productId": self.test_product_with_stock_id,
                        "quantity": 1
                    }
                ],
                "discountCode": self.test_discount_code,
                "whatsAppNumber": "555123456",
                "countryCode": "+966"
            }
            
            response = self.make_request("POST", "/orders", order_data, self.user_token)
            
            if response.status_code == 201:
                order = response.json()
                order_id = order["id"]
                
                self.log(f"✅ Order created: {order_id[:8]}")
                self.log(f"Order status: {order['status']}")
                self.log(f"Order total: ${order['total']}")
                self.log(f"Payment method: {order.get('paymentMethod', 'N/A')}")
                
                # Verify order details
                if order["total"] == 0:
                    self.log("✅ Order total is $0 (free order)")
                else:
                    self.log(f"❌ Expected free order, but total is ${order['total']}", "ERROR")
                    return False
                
                if order["status"] == "completed":
                    self.log("✅ Order status is 'completed' as expected")
                else:
                    self.log(f"❌ Expected 'completed' status, got '{order['status']}'", "ERROR")
                    return False
                
                # Check if codes were delivered
                if order["items"][0].get("deliveredCodes"):
                    delivered_count = len(order["items"][0]["deliveredCodes"])
                    self.log(f"✅ {delivered_count} codes delivered automatically")
                else:
                    self.log("❌ No codes were delivered for completed order", "ERROR")
                    return False
                
                # Verify pending count is 0
                pending_count = order["items"][0].get("pendingCount", 0)
                if pending_count == 0:
                    self.log("✅ No pending deliveries")
                else:
                    self.log(f"❌ Expected 0 pending, got {pending_count}", "ERROR")
                    return False
                    
                return True
            else:
                self.log(f"❌ Failed to create order: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 1 failed: {e}", "ERROR")
            return False
    
    def test_free_order_no_stock(self) -> bool:
        """Test Scenario 2: Free Order with Out-of-Stock Product - Should be 'pending_delivery'"""
        self.log("\n=== TEST 2: Free Order with Out-of-Stock Product ===")
        
        try:
            # Create order with product that has no stock + 100% discount
            order_data = {
                "items": [
                    {
                        "productId": self.test_product_no_stock_id,
                        "quantity": 1
                    }
                ],
                "discountCode": self.test_discount_code,
                "whatsAppNumber": "555654321", 
                "countryCode": "+966"
            }
            
            response = self.make_request("POST", "/orders", order_data, self.user_token)
            
            if response.status_code == 201:
                order = response.json()
                order_id = order["id"]
                
                self.log(f"✅ Order created: {order_id[:8]}")
                self.log(f"Order status: {order['status']}")
                self.log(f"Order total: ${order['total']}")
                self.log(f"Payment method: {order.get('paymentMethod', 'N/A')}")
                
                # Verify order details
                if order["total"] == 0:
                    self.log("✅ Order total is $0 (free order)")
                else:
                    self.log(f"❌ Expected free order, but total is ${order['total']}", "ERROR")
                    return False
                
                # CRITICAL CHECK: Status should be 'pending_delivery' NOT 'completed'
                if order["status"] == "pending_delivery":
                    self.log("✅ Order status is 'pending_delivery' as expected")
                else:
                    self.log(f"❌ CRITICAL BUG: Expected 'pending_delivery' status, got '{order['status']}'", "ERROR")
                    return False
                
                # Check pending count
                pending_count = order["items"][0].get("pendingCount", 0)
                if pending_count > 0:
                    self.log(f"✅ {pending_count} codes pending delivery")
                else:
                    self.log(f"❌ Expected pending count > 0, got {pending_count}", "ERROR")
                    return False
                
                # Check no codes were delivered
                delivered_codes = order["items"][0].get("deliveredCodes", [])
                if len(delivered_codes) == 0:
                    self.log("✅ No codes delivered (as expected - out of stock)")
                else:
                    self.log(f"❌ Unexpected: {len(delivered_codes)} codes delivered despite no stock", "ERROR")
                    return False
                    
                return True
            else:
                self.log(f"❌ Failed to create order: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 2 failed: {e}", "ERROR")
            return False
    
    def test_paid_order_no_stock(self) -> bool:
        """Test Scenario 3: Paid Order with Out-of-Stock Product - Should be 'pending_delivery'"""
        self.log("\n=== TEST 3: Paid Order with Out-of-Stock Product ===")
        
        try:
            # Create order with product that has no stock, no discount (paid order)
            order_data = {
                "items": [
                    {
                        "productId": self.test_product_no_stock_id,
                        "quantity": 1
                    }
                ],
                "whatsAppNumber": "555789123",
                "countryCode": "+966"
            }
            
            response = self.make_request("POST", "/orders", order_data, self.user_token)
            
            if response.status_code == 201:
                order = response.json()
                order_id = order["id"]
                
                self.log(f"✅ Order created: {order_id[:8]}")
                self.log(f"Order status: {order['status']}")
                self.log(f"Order total: ${order['total']}")
                self.log(f"Payment method: {order.get('paymentMethod', 'N/A')}")
                
                # Verify order details
                if order["total"] > 0:
                    self.log(f"✅ Order total is ${order['total']} (paid order)")
                else:
                    self.log(f"❌ Expected paid order, but total is ${order['total']}", "ERROR")
                    return False
                
                # Status should be 'pending_delivery' due to no stock
                if order["status"] == "pending_delivery":
                    self.log("✅ Order status is 'pending_delivery' as expected")
                else:
                    self.log(f"❌ Expected 'pending_delivery' status, got '{order['status']}'", "ERROR")
                    return False
                
                # Check pending count
                pending_count = order["items"][0].get("pendingCount", 0)
                if pending_count > 0:
                    self.log(f"✅ {pending_count} codes pending delivery")
                else:
                    self.log(f"❌ Expected pending count > 0, got {pending_count}", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Failed to create order: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 3 failed: {e}", "ERROR")
            return False
    
    def test_mixed_order(self) -> bool:
        """Test Scenario 4: Mixed Order (some stock, some out of stock) - Should be 'pending_delivery'"""
        self.log("\n=== TEST 4: Mixed Order (Stock + No Stock) ===")
        
        try:
            # Create order with both products: one with stock, one without
            order_data = {
                "items": [
                    {
                        "productId": self.test_product_with_stock_id,
                        "quantity": 1  # This has stock
                    },
                    {
                        "productId": self.test_product_no_stock_id,
                        "quantity": 1  # This has no stock
                    }
                ],
                "whatsAppNumber": "555456789",
                "countryCode": "+966"
            }
            
            response = self.make_request("POST", "/orders", order_data, self.user_token)
            
            if response.status_code == 201:
                order = response.json()
                order_id = order["id"]
                
                self.log(f"✅ Order created: {order_id[:8]}")
                self.log(f"Order status: {order['status']}")
                self.log(f"Order total: ${order['total']}")
                
                # Status should be 'pending_delivery' because at least one item has no stock
                if order["status"] == "pending_delivery":
                    self.log("✅ Order status is 'pending_delivery' as expected (mixed stock)")
                else:
                    self.log(f"❌ Expected 'pending_delivery' status, got '{order['status']}'", "ERROR")
                    return False
                
                # Check each item
                for i, item in enumerate(order["items"]):
                    product_name = item["productName"]
                    delivered_codes = item.get("deliveredCodes", [])
                    pending_count = item.get("pendingCount", 0)
                    
                    self.log(f"Item {i+1}: {product_name}")
                    self.log(f"  - Delivered codes: {len(delivered_codes)}")
                    self.log(f"  - Pending count: {pending_count}")
                    
                    # First item (with stock) should have delivered codes
                    if i == 0 and len(delivered_codes) > 0:
                        self.log("  ✅ Product A has delivered codes")
                    elif i == 0:
                        self.log("  ❌ Product A should have delivered codes", "ERROR")
                        return False
                    
                    # Second item (no stock) should have pending count
                    if i == 1 and pending_count > 0:
                        self.log("  ✅ Product B has pending count")
                    elif i == 1:
                        self.log("  ❌ Product B should have pending count", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Failed to create order: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test 4 failed: {e}", "ERROR")
            return False
    
    def test_order_retrieval(self, order_id: str) -> bool:
        """Test order retrieval endpoints"""
        self.log(f"\n=== Testing Order Retrieval for {order_id[:8]} ===")
        
        try:
            # Test GET /api/orders/{id}
            response = self.make_request("GET", f"/orders/{order_id}", token=self.user_token)
            
            if response.status_code == 200:
                order = response.json()
                self.log("✅ Order retrieval successful")
                self.log(f"Order status: {order['status']}")
                
                # Verify order structure
                required_fields = ["id", "status", "items", "total", "createdAt"]
                for field in required_fields:
                    if field in order:
                        self.log(f"✅ Field '{field}' present")
                    else:
                        self.log(f"❌ Missing field '{field}'", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Failed to retrieve order: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Order retrieval test failed: {e}", "ERROR")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all test scenarios"""
        self.log("🚀 Starting Backend Order Flow Tests")
        self.log("=" * 50)
        
        results = {}
        
        # Setup phase
        if not self.setup_admin_and_user():
            self.log("❌ Setup failed, aborting tests", "ERROR")
            return {"setup": False}
        
        if not self.create_test_data():
            self.log("❌ Test data creation failed, aborting tests", "ERROR")  
            return {"setup": True, "test_data": False}
        
        # Run test scenarios
        results["setup"] = True
        results["test_data"] = True
        results["test_1_free_with_stock"] = self.test_free_order_with_stock()
        results["test_2_free_no_stock"] = self.test_free_order_no_stock()
        results["test_3_paid_no_stock"] = self.test_paid_order_no_stock()
        results["test_4_mixed_order"] = self.test_mixed_order()
        
        # Summary
        self.log("\n" + "=" * 50)
        self.log("🏁 TEST RESULTS SUMMARY")
        self.log("=" * 50)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if results.get("test_2_free_no_stock", False):
            self.log("\n✅ CRITICAL: Free orders with out-of-stock products correctly show 'pending_delivery'")
        else:
            self.log("\n❌ CRITICAL: Bug found in free order status logic!")
        
        return results

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    all_passed = all(results.values())
    exit(0 if all_passed else 1)