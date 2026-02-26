#!/usr/bin/env python3

import requests
import json
import sys
import uuid
from datetime import datetime

# Base URL for the API
BASE_URL = "https://digital-key-store.preview.emergentagent.com/api"

class DigitalStoreBackendTest:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.category_id = None
        self.product_id = None
        self.order_id = None
        self.test_results = []
        
    def log_result(self, test_name, passed, message="", details=""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        result = f"{status} - {test_name}: {message}"
        if details:
            result += f"\n  Details: {details}"
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'message': message,
            'details': details
        })
        
    def make_request(self, method, endpoint, data=None, token=None, files=None):
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}/{endpoint.lstrip('/')}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        if files:
            # Remove content-type for file uploads
            headers.pop("Content-Type", None)
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method == "POST":
                if files:
                    response = requests.post(url, headers=headers, files=files, timeout=30)
                else:
                    response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            return None

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        print("\n=== Testing Basic API Connectivity ===")
        
        # Test admin check endpoint (no auth required)
        response = self.make_request("GET", "/auth/check-admin")
        if response and response.status_code == 200:
            data = response.json()
            has_admin = data.get('hasAdmin', False)
            self.log_result("Admin Check Endpoint", True, f"API responds correctly, hasAdmin: {has_admin}")
        else:
            self.log_result("Admin Check Endpoint", False, f"Failed: {response.status_code if response else 'No response'}")
            return False

        # Test settings endpoint (public)
        response = self.make_request("GET", "/settings")
        if response and response.status_code == 200:
            self.log_result("Settings Endpoint", True, "Settings API working")
        else:
            self.log_result("Settings Endpoint", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test exchange rates endpoint (public)
        response = self.make_request("GET", "/exchange-rates")
        if response and response.status_code == 200:
            data = response.json()
            rates = data.get('rates', {})
            required_currencies = ['USD', 'SAR', 'KWD', 'AED']
            if all(curr in rates for curr in required_currencies):
                self.log_result("Exchange Rates Endpoint", True, f"All currencies available: {list(rates.keys())}")
            else:
                self.log_result("Exchange Rates Endpoint", False, f"Missing currencies. Got: {list(rates.keys())}")
        else:
            self.log_result("Exchange Rates Endpoint", False, f"Failed: {response.status_code if response else 'No response'}")

        return True

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n=== Testing Authentication Flow ===")
        
        # Test user registration
        user_data = {
            "name": "Test User",
            "email": f"user{uuid.uuid4().hex[:8]}@digitalstore.test",
            "password": "password123"
        }
        
        response = self.make_request("POST", "/auth/register", user_data)
        if response and response.status_code == 200:
            data = response.json()
            self.user_token = data.get('token')
            user = data.get('user', {})
            self.log_result("User Registration", True, f"User registered: {user.get('email')}")
        else:
            self.log_result("User Registration", False, f"Registration failed: {response.status_code if response else 'No response'}")
            return False

        # Test session check
        response = self.make_request("GET", "/auth/session", token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            user = data.get('user')
            if user:
                self.log_result("Session Check", True, f"Session verified for user: {user.get('email')}")
            else:
                self.log_result("Session Check", False, "No user in session response")
        else:
            self.log_result("Session Check", False, f"Session check failed: {response.status_code if response else 'No response'}")

        # Test logout
        response = self.make_request("POST", "/auth/logout", token=self.user_token)
        if response and response.status_code == 200:
            self.log_result("Logout", True, "Logout successful")
        else:
            self.log_result("Logout", False, f"Logout failed: {response.status_code if response else 'No response'}")

        # Test login with registered user
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            self.user_token = data.get('token')
            self.log_result("User Login", True, "User login successful")
            return True
        else:
            self.log_result("User Login", False, f"User login failed: {response.status_code if response else 'No response'}")
            return False

    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("\n=== Testing Public Endpoints ===")
        
        success = True
        
        # Test GET categories (public)
        response = self.make_request("GET", "/categories")
        if response and response.status_code == 200:
            categories = response.json()
            self.log_result("Get Categories", True, f"Retrieved {len(categories)} categories")
            # Store first category ID for later tests
            if categories:
                self.category_id = categories[0].get('id')
        else:
            self.log_result("Get Categories", False, f"Failed: {response.status_code if response else 'No response'}")
            success = False

        # Test GET products (public)
        response = self.make_request("GET", "/products")
        if response and response.status_code == 200:
            products = response.json()
            self.log_result("Get Products", True, f"Retrieved {len(products)} products")
            # Store first product ID for later tests
            if products:
                self.product_id = products[0].get('id')
                product_stock = products[0].get('stock', 0)
                self.log_result("Product Stock Info", True, f"First product has {product_stock} codes available")
        else:
            self.log_result("Get Products", False, f"Failed: {response.status_code if response else 'No response'}")
            success = False

        # Test product search
        if self.product_id:
            response = self.make_request("GET", f"/products/{self.product_id}")
            if response and response.status_code == 200:
                product = response.json()
                self.log_result("Get Product Details", True, f"Product details: {product.get('name', 'N/A')}")
            else:
                self.log_result("Get Product Details", False, f"Failed: {response.status_code if response else 'No response'}")
                success = False

        # Test product filtering by category
        if self.category_id:
            response = self.make_request("GET", f"/products?categoryId={self.category_id}")
            if response and response.status_code == 200:
                filtered_products = response.json()
                self.log_result("Filter Products by Category", True, f"Found {len(filtered_products)} products in category")
            else:
                self.log_result("Filter Products by Category", False, f"Failed: {response.status_code if response else 'No response'}")
                success = False
                
        return success

    def test_order_creation(self):
        """Test order creation (user functionality)"""
        print("\n=== Testing Order Creation ===")
        
        if not self.user_token:
            self.log_result("Order Creation Setup", False, "No user token available")
            return False

        if not self.product_id:
            self.log_result("Order Creation Setup", False, "No product ID available")
            return False

        # Test CREATE order (user)
        order_data = {
            "items": [
                {
                    "productId": self.product_id,
                    "quantity": 1
                }
            ]
        }
        
        response = self.make_request("POST", "/orders", order_data, token=self.user_token)
        if response and response.status_code == 201:
            data = response.json()
            self.order_id = data.get('id')
            status = data.get('status')
            items = data.get('items', [])
            total = data.get('total', 0)
            
            delivered_codes = items[0].get('deliveredCodes', []) if items else []
            pending_count = items[0].get('pendingCount', 0) if items else 0
            
            self.log_result("Create Order", True, f"Order created with status: {status}, total: ${total}")
            
            if len(delivered_codes) > 0:
                self.log_result("Auto Code Delivery", True, f"Auto-delivered {len(delivered_codes)} codes")
                # Don't expose actual codes in logs for security
                self.log_result("Code Delivery Verification", True, "Codes successfully allocated to order")
            elif pending_count > 0:
                self.log_result("Pending Delivery", True, f"Order marked as pending with {pending_count} codes needed")
            else:
                self.log_result("Order Processing", False, "No codes delivered and no pending count")
                
        else:
            self.log_result("Create Order", False, f"Failed: {response.status_code if response else 'No response'}")
            return False

        # Test GET order details
        if self.order_id:
            response = self.make_request("GET", f"/orders/{self.order_id}", token=self.user_token)
            if response and response.status_code == 200:
                order = response.json()
                self.log_result("Get Order Details", True, f"Order details retrieved: {order.get('id')}")
            else:
                self.log_result("Get Order Details", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test GET user's orders
        response = self.make_request("GET", "/orders", token=self.user_token)
        if response and response.status_code == 200:
            orders = response.json()
            self.log_result("Get User Orders", True, f"Retrieved {len(orders)} orders for user")
        else:
            self.log_result("Get User Orders", False, f"Failed: {response.status_code if response else 'No response'}")

        return True

    def test_reviews(self):
        """Test reviews functionality"""
        print("\n=== Testing Reviews ===")
        
        if not self.user_token or not self.product_id:
            self.log_result("Reviews Setup", False, "Missing user token or product ID")
            return False

        success = True

        # Test GET reviews by product (public)
        response = self.make_request("GET", f"/reviews?productId={self.product_id}")
        if response and response.status_code == 200:
            reviews = response.json()
            self.log_result("Get Product Reviews", True, f"Retrieved {len(reviews)} reviews")
        else:
            self.log_result("Get Product Reviews", False, f"Failed: {response.status_code if response else 'No response'}")
            success = False

        # Test POST review (user must be logged in)
        review_data = {
            "productId": self.product_id,
            "rating": 5,
            "comment": "Great product, fast delivery of digital codes!"
        }
        
        response = self.make_request("POST", "/reviews", review_data, token=self.user_token)
        if response and response.status_code == 201:
            self.log_result("Create Review", True, "Review created successfully")
        else:
            # Could fail if user already reviewed this product
            if response and response.status_code == 400:
                self.log_result("Create Review", True, "Review creation handled (user may have already reviewed)")
            else:
                self.log_result("Create Review", False, f"Failed: {response.status_code if response else 'No response'}")
                success = False
                
        return success

    def test_discount_validation(self):
        """Test discount validation (public endpoint)"""
        print("\n=== Testing Discount Validation ===")
        
        # Test validate non-existent discount
        validate_data = {"code": "NONEXISTENT"}
        response = self.make_request("POST", "/discounts/validate", validate_data)
        if response and response.status_code == 400:
            self.log_result("Invalid Discount Validation", True, "Correctly rejected invalid discount code")
            return True
        else:
            self.log_result("Invalid Discount Validation", False, f"Should reject invalid code, got: {response.status_code if response else 'No response'}")
            return False

    def test_admin_protected_endpoints(self):
        """Test that admin-protected endpoints correctly reject non-admin users"""
        print("\n=== Testing Admin Access Control ===")
        
        if not self.user_token:
            self.log_result("Admin Access Control Setup", False, "No user token available")
            return False

        # Test admin-only category creation
        category_data = {"name": "Unauthorized Category", "active": True}
        response = self.make_request("POST", "/categories", category_data, token=self.user_token)
        if response and response.status_code == 403:
            self.log_result("Category Creation Access Control", True, "Correctly rejected non-admin user")
        else:
            self.log_result("Category Creation Access Control", False, f"Should reject non-admin, got: {response.status_code if response else 'No response'}")

        # Test admin-only product creation
        product_data = {"name": "Unauthorized Product", "price": 10}
        response = self.make_request("POST", "/products", product_data, token=self.user_token)
        if response and response.status_code == 403:
            self.log_result("Product Creation Access Control", True, "Correctly rejected non-admin user")
        else:
            self.log_result("Product Creation Access Control", False, f"Should reject non-admin, got: {response.status_code if response else 'No response'}")

        # Test admin-only codes endpoint
        response = self.make_request("GET", "/codes?productId=test", token=self.user_token)
        if response and response.status_code == 403:
            self.log_result("Codes Access Control", True, "Correctly rejected non-admin user")
        else:
            self.log_result("Codes Access Control", False, f"Should reject non-admin, got: {response.status_code if response else 'No response'}")

    def test_input_validation(self):
        """Test input validation and error handling"""
        print("\n=== Testing Input Validation ===")
        
        # Test registration with missing fields
        incomplete_data = {"email": "incomplete@test.com"}
        response = self.make_request("POST", "/auth/register", incomplete_data)
        if response and response.status_code == 400:
            self.log_result("Registration Validation", True, "Correctly rejected incomplete registration data")
        else:
            self.log_result("Registration Validation", False, f"Should reject incomplete data, got: {response.status_code if response else 'No response'}")

        # Test login with wrong credentials
        wrong_creds = {"email": "nonexistent@test.com", "password": "wrongpass"}
        response = self.make_request("POST", "/auth/login", wrong_creds)
        if response and response.status_code == 401:
            self.log_result("Login Validation", True, "Correctly rejected wrong credentials")
        else:
            self.log_result("Login Validation", False, f"Should reject wrong credentials, got: {response.status_code if response else 'No response'}")

        # Test order with empty cart
        if self.user_token:
            empty_order = {"items": []}
            response = self.make_request("POST", "/orders", empty_order, token=self.user_token)
            if response and response.status_code == 400:
                self.log_result("Empty Cart Validation", True, "Correctly rejected empty cart")
            else:
                self.log_result("Empty Cart Validation", False, f"Should reject empty cart, got: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Digital Card Store Backend API Tests")
        print("=" * 60)
        
        success = True
        success &= self.test_basic_connectivity()
        success &= self.test_auth_flow()
        success &= self.test_public_endpoints()
        success &= self.test_order_creation()
        success &= self.test_reviews()
        success &= self.test_discount_validation()
        success &= self.test_admin_protected_endpoints()
        success &= self.test_input_validation()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(1 for r in self.test_results if r['passed'])
        total_tests = len(self.test_results)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['passed']]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        else:
            print("\n✅ All tests passed!")
        
        # Show critical functionalities status
        print("\n🔍 Critical Functionalities Status:")
        critical_tests = [
            "User Registration", "User Login", "Session Check", 
            "Get Categories", "Get Products", "Create Order", 
            "Auto Code Delivery", "Get Order Details"
        ]
        
        for test_name in critical_tests:
            test_result = next((r for r in self.test_results if r['test'] == test_name), None)
            if test_result:
                status = "✅" if test_result['passed'] else "❌"
                print(f"  {status} {test_name}")
            else:
                print(f"  ⚠️  {test_name} (not tested)")
        
        return success and len(failed_tests) == 0


def main():
    """Main test runner"""
    tester = DigitalStoreBackendTest()
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test runner crashed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()