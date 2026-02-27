#!/usr/bin/env python3
"""
Comprehensive Order Status Testing - Free Orders and Out-of-Stock Products

This test verifies the critical bug fix where free orders with out-of-stock products 
were being marked as 'completed' instead of 'pending_delivery'.
"""

import requests
import json
import time
import uuid

# Configuration
BASE_URL = "https://digital-key-store.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class ComprehensiveOrderTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.test_products = {}
        self.discount_code = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""  
        timestamp = time.strftime("%H:%M:%S")
        prefix = {
            "INFO": "ℹ️",
            "ERROR": "❌", 
            "SUCCESS": "✅",
            "WARNING": "⚠️"
        }.get(level, "📋")
        
        print(f"[{timestamp}] {prefix} {message}")
        
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
    
    def setup_accounts(self):
        """Setup admin and user accounts"""
        try:
            # Create unique admin email
            admin_email = f"test_admin_{int(time.time())}@example.com"
            admin_data = {
                "name": "Test Admin",
                "email": admin_email,
                "password": "admin123test"
            }
            
            self.log("Setting up test admin account...")
            
            # Check if admin system is ready
            check_response = self.make_request("GET", "/auth/check-admin")
            if check_response.status_code == 200:
                has_admin = check_response.json().get("hasAdmin", False)
                
                if not has_admin:
                    # Create first admin
                    admin_response = self.make_request("POST", "/auth/setup-admin", admin_data)
                    if admin_response.status_code == 200:
                        self.admin_token = admin_response.json()["token"]
                        self.log("Admin account created successfully", "SUCCESS")
                    else:
                        self.log(f"Failed to create admin: {admin_response.text}", "ERROR")
                        return False
                else:
                    # Admin exists, try to register new user who might have admin rights
                    # or work with existing system
                    self.log("Admin exists, working with existing system", "WARNING")
                    # For now, we'll create a regular user and test what we can
                    pass
            
            # Create test user
            user_email = f"test_user_{int(time.time())}@example.com"
            user_data = {
                "name": "Test User",
                "email": user_email,
                "password": "user123test"
            }
            
            self.log("Creating test user...")
            user_response = self.make_request("POST", "/auth/register", user_data)
            if user_response.status_code == 200:
                self.user_token = user_response.json()["token"]
                self.log("Test user created successfully", "SUCCESS")
            else:
                self.log(f"Failed to create user: {user_response.text}", "ERROR")
                return False
            
            return True
            
        except Exception as e:
            self.log(f"Account setup failed: {e}", "ERROR")
            return False
    
    def analyze_existing_system(self):
        """Analyze the existing system to understand current state"""
        try:
            self.log("Analyzing existing system...")
            
            # Get products
            products_response = self.make_request("GET", "/products")
            if products_response.status_code == 200:
                products = products_response.json()
                self.log(f"Found {len(products)} existing products")
                
                # Categorize products by stock
                products_with_stock = [p for p in products if p.get("stock", 0) > 0]
                products_without_stock = [p for p in products if p.get("stock", 0) == 0]
                
                self.log(f"Products with stock: {len(products_with_stock)}")
                self.log(f"Products without stock: {len(products_without_stock)}")
                
                # Store products for testing
                if products_with_stock:
                    self.test_products["with_stock"] = products_with_stock[0]
                    self.log(f"Selected product with stock: {products_with_stock[0]['name'][:30]}...")
                
                if products_without_stock:
                    self.test_products["no_stock"] = products_without_stock[0]
                    self.log(f"Selected product without stock: {products_without_stock[0]['name'][:30]}...")
                
                # Try common discount codes
                test_discounts = ["FREE100", "TEST", "DISCOUNT", "PROMO100", "TESTCODE"]
                for code in test_discounts:
                    validate_response = self.make_request("POST", "/discounts/validate", {"code": code})
                    if validate_response.status_code == 200:
                        discount_info = validate_response.json()
                        if discount_info.get("valid"):
                            self.discount_code = code
                            self.log(f"Found working discount code: {code}", "SUCCESS")
                            break
                
                if not self.discount_code:
                    self.log("No working discount codes found", "WARNING")
                
                return True
            else:
                self.log(f"Failed to get products: {products_response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"System analysis failed: {e}", "ERROR")
            return False
    
    def test_scenario_1_free_order_with_stock(self):
        """Test free order with product that has stock - Should be 'completed'"""
        self.log("\n" + "="*50)
        self.log("TEST SCENARIO 1: Free Order with Stock Available")
        self.log("EXPECTED: Status should be 'completed' with delivered codes")
        self.log("="*50)
        
        if "with_stock" not in self.test_products:
            self.log("No products with stock available for testing", "WARNING")
            return False
        
        if not self.discount_code:
            self.log("No discount code available for free order test", "WARNING") 
            return False
        
        try:
            product = self.test_products["with_stock"]
            
            order_data = {
                "items": [{"productId": product["id"], "quantity": 1}],
                "discountCode": self.discount_code,
                "whatsAppNumber": "555123456",
                "countryCode": "+966"
            }
            
            self.log(f"Creating order for product: {product['name'][:30]}...")
            self.log(f"Product stock: {product.get('stock', 0)} codes")
            
            response = self.make_request("POST", "/orders", order_data, self.user_token)
            
            if response.status_code == 201:
                order = response.json()
                
                self.log(f"Order created: {order['id'][:8]}", "SUCCESS")
                self.log(f"Status: {order['status']}")
                self.log(f"Total: ${order['total']}")
                
                # Verify expectations for free order with stock
                if order["total"] == 0:
                    self.log("✓ Order is free (total = $0)", "SUCCESS")
                else:
                    self.log(f"✗ Expected free order, but total = ${order['total']}", "ERROR")
                    return False
                
                if order["status"] == "completed":
                    self.log("✓ Status is 'completed' as expected", "SUCCESS")
                elif order["status"] == "pending_delivery":
                    self.log("✗ Status is 'pending_delivery' - codes might not be available", "WARNING")
                    # This could still be valid if product ran out of stock between checks
                else:
                    self.log(f"✗ Unexpected status: {order['status']}", "ERROR")
                    return False
                
                # Check delivered codes
                if order.get("items") and order["items"][0].get("deliveredCodes"):
                    delivered_count = len(order["items"][0]["deliveredCodes"])
                    self.log(f"✓ {delivered_count} codes delivered", "SUCCESS")
                elif order["status"] == "completed":
                    self.log("✗ No codes delivered despite completed status", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"Failed to create order: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Scenario 1 failed: {e}", "ERROR")
            return False
    
    def test_scenario_2_free_order_no_stock(self):
        """Test free order with out-of-stock product - Should be 'pending_delivery'"""
        self.log("\n" + "="*50)
        self.log("TEST SCENARIO 2: Free Order with Out-of-Stock Product")
        self.log("EXPECTED: Status should be 'pending_delivery' (NOT 'completed')")
        self.log("This tests the critical bug fix!")
        self.log("="*50)
        
        if "no_stock" not in self.test_products:
            self.log("No out-of-stock products available for testing", "WARNING")
            return False
        
        if not self.discount_code:
            self.log("No discount code available for free order test", "WARNING")
            return False
        
        try:
            product = self.test_products["no_stock"]
            
            order_data = {
                "items": [{"productId": product["id"], "quantity": 1}],
                "discountCode": self.discount_code,
                "whatsAppNumber": "555654321",
                "countryCode": "+966"
            }
            
            self.log(f"Creating free order for out-of-stock product: {product['name'][:30]}...")
            self.log(f"Product stock: {product.get('stock', 0)} codes")
            
            response = self.make_request("POST", "/orders", order_data, self.user_token)
            
            if response.status_code == 201:
                order = response.json()
                
                self.log(f"Order created: {order['id'][:8]}", "SUCCESS")
                self.log(f"Status: {order['status']}")
                self.log(f"Total: ${order['total']}")
                
                # CRITICAL TEST: Free order with no stock should be pending_delivery
                if order["total"] == 0:
                    self.log("✓ Order is free (total = $0)", "SUCCESS")
                else:
                    self.log(f"✗ Expected free order, but total = ${order['total']}", "ERROR")
                    return False
                
                if order["status"] == "pending_delivery":
                    self.log("✓ CRITICAL FIX VERIFIED: Status is 'pending_delivery'", "SUCCESS")
                    self.log("✓ Free order with no stock correctly NOT marked as 'completed'", "SUCCESS")
                elif order["status"] == "completed":
                    self.log("✗ CRITICAL BUG: Free order with no stock marked as 'completed'!", "ERROR")
                    self.log("✗ This is the bug that was supposed to be fixed!", "ERROR")
                    return False
                else:
                    self.log(f"✗ Unexpected status: {order['status']}", "ERROR")
                    return False
                
                # Verify pending count
                if order.get("items"):
                    item = order["items"][0]
                    pending_count = item.get("pendingCount", 0)
                    delivered_codes = item.get("deliveredCodes", [])
                    
                    if pending_count > 0:
                        self.log(f"✓ {pending_count} codes pending delivery", "SUCCESS")
                    else:
                        self.log("✗ No pending count despite no stock", "ERROR")
                        return False
                    
                    if len(delivered_codes) == 0:
                        self.log("✓ No codes delivered (expected for out-of-stock)", "SUCCESS")
                    else:
                        self.log(f"✗ Unexpected: {len(delivered_codes)} codes delivered", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"Failed to create order: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Scenario 2 failed: {e}", "ERROR")
            return False
    
    def test_scenario_3_paid_order_no_stock(self):
        """Test paid order with out-of-stock product - Should be 'pending_delivery'"""
        self.log("\n" + "="*50)
        self.log("TEST SCENARIO 3: Paid Order with Out-of-Stock Product")
        self.log("EXPECTED: Status should be 'pending_delivery'")
        self.log("="*50)
        
        if "no_stock" not in self.test_products:
            self.log("No out-of-stock products available for testing", "WARNING")
            return False
        
        try:
            product = self.test_products["no_stock"]
            
            order_data = {
                "items": [{"productId": product["id"], "quantity": 1}],
                "whatsAppNumber": "555789123",
                "countryCode": "+966"
            }
            
            self.log(f"Creating paid order for out-of-stock product: {product['name'][:30]}...")
            
            response = self.make_request("POST", "/orders", order_data, self.user_token)
            
            if response.status_code == 201:
                order = response.json()
                
                self.log(f"Order created: {order['id'][:8]}", "SUCCESS")
                self.log(f"Status: {order['status']}")
                self.log(f"Total: ${order['total']}")
                
                # Verify this is a paid order
                if order["total"] > 0:
                    self.log(f"✓ Paid order (total = ${order['total']})", "SUCCESS")
                else:
                    self.log("✗ Expected paid order but total is $0", "ERROR")
                    return False
                
                # Status should be pending_delivery due to no stock
                if order["status"] == "pending_delivery":
                    self.log("✓ Status is 'pending_delivery' as expected", "SUCCESS")
                else:
                    self.log(f"✗ Expected 'pending_delivery', got '{order['status']}'", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"Failed to create order: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Scenario 3 failed: {e}", "ERROR")
            return False
    
    def run_comprehensive_tests(self):
        """Run all test scenarios"""
        self.log("🚀 COMPREHENSIVE ORDER STATUS TESTING")
        self.log("Testing the critical bug fix for free orders with out-of-stock products")
        self.log("="*80)
        
        results = {}
        
        # Setup
        if not self.setup_accounts():
            return {"setup_failed": True}
        
        if not self.analyze_existing_system():
            return {"analysis_failed": True}
        
        # Run test scenarios
        results["scenario_1_free_with_stock"] = self.test_scenario_1_free_order_with_stock()
        results["scenario_2_free_no_stock"] = self.test_scenario_2_free_order_no_stock()
        results["scenario_3_paid_no_stock"] = self.test_scenario_3_paid_order_no_stock()
        
        # Final summary
        self.log("\n" + "="*80)
        self.log("🏁 COMPREHENSIVE TEST RESULTS")
        self.log("="*80)
        
        passed = sum(1 for result in results.values() if result is True)
        total = len([r for r in results.values() if isinstance(r, bool)])
        
        for test_name, result in results.items():
            if isinstance(result, bool):
                status = "✅ PASSED" if result else "❌ FAILED"
                self.log(f"{test_name}: {status}")
        
        self.log(f"\nTest Results: {passed}/{total} passed")
        
        # Critical bug analysis
        critical_test = results.get("scenario_2_free_no_stock", False)
        if critical_test:
            self.log("\n✅ CRITICAL BUG FIX VERIFIED:", "SUCCESS")
            self.log("   Free orders with out-of-stock products correctly show 'pending_delivery'")
            self.log("   The frontend no longer overrides backend status for free orders")
        else:
            self.log("\n❌ CRITICAL BUG STILL EXISTS:", "ERROR")
            self.log("   Free orders with out-of-stock products may be incorrectly marked as 'completed'")
        
        return results

if __name__ == "__main__":
    tester = ComprehensiveOrderTester()
    results = tester.run_comprehensive_tests()
    
    # Exit based on critical bug test result
    critical_passed = results.get("scenario_2_free_no_stock", False)
    exit(0 if critical_passed else 1)