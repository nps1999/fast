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

    def test_admin_setup(self):
        """Test admin setup endpoint"""
        print("\n=== Testing Admin Setup ===")
        
        # First check if admin exists
        response = self.make_request("GET", "/auth/check-admin")
        if response and response.status_code == 200:
            has_admin = response.json().get('hasAdmin', False)
            if has_admin:
                self.log_result("Admin Check", True, "Admin already exists")
                # Try to login with a few common admin credentials
                return self.test_existing_admin_login()
            else:
                self.log_result("Admin Check", True, "No admin exists, proceeding with setup")
        else:
            self.log_result("Admin Check", False, f"Failed to check admin status: {response.status_code if response else 'No response'}")
            return False

        # Try to create admin
        admin_data = {
            "name": "Test Admin",
            "email": "admin@digitalstore.test", 
            "password": "admin123456"
        }
        
        response = self.make_request("POST", "/auth/setup-admin", admin_data)
        if response:
            if response.status_code == 201:
                data = response.json()
                self.admin_token = data.get('token')
                self.log_result("Admin Setup", True, f"Admin created successfully")
                return True
            elif response.status_code == 400 and "يوجد مدير بالفعل" in response.text:
                self.log_result("Admin Setup", True, "Admin already exists, testing login instead")
                return self.test_existing_admin_login()
            else:
                self.log_result("Admin Setup", False, f"Failed with status {response.status_code}: {response.text}")
    def test_existing_admin_login(self):
        """Try to login with existing admin using common credentials"""
        # Try different common admin credentials
        admin_credentials = [
            {"email": "admin@test.com", "password": "admin123"},
            {"email": "admin@digitalstore.test", "password": "admin123456"},
            {"email": "admin@example.com", "password": "admin123"},
            {"email": "admin@localhost", "password": "admin123"},
            {"email": "test@test.com", "password": "test123"}
        ]
        
        for creds in admin_credentials:
            response = self.make_request("POST", "/auth/login", creds)
            if response and response.status_code == 200:
                data = response.json()
                user = data.get('user', {})
                if user.get('role') == 'admin':
                    self.admin_token = data.get('token')
                    self.log_result("Existing Admin Login", True, f"Successfully logged in admin: {creds['email']}")
                    return True
        
        self.log_result("Existing Admin Login", False, "Could not login with any common admin credentials")
        return False
        else:
            self.log_result("Admin Setup", False, "No response from server")
        
        return False
        
    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "email": "admin@digitalstore.test",
            "password": "admin123456"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            self.admin_token = data.get('token')
            self.log_result("Admin Login", True, "Admin logged in successfully")
            return True
        else:
            self.log_result("Admin Login", False, f"Login failed: {response.status_code if response else 'No response'}")
            return False

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
            self.log_result("User Registration", True, "User registered successfully")
        else:
            self.log_result("User Registration", False, f"Registration failed: {response.status_code if response else 'No response'}")
            return False

        # Test session check
        response = self.make_request("GET", "/auth/session", token=self.user_token)
        if response and response.status_code == 200:
            self.log_result("Session Check", True, "Session verified successfully")
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

    def test_categories_crud(self):
        """Test categories CRUD operations"""
        print("\n=== Testing Categories CRUD ===")
        
        # Test GET categories (public)
        response = self.make_request("GET", "/categories")
        if response and response.status_code == 200:
            self.log_result("Get Categories", True, f"Retrieved {len(response.json())} categories")
        else:
            self.log_result("Get Categories", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test CREATE category (admin only)
        category_data = {
            "name": "Test Gaming Category",
            "image": "",
            "order": 1,
            "active": True
        }
        
        response = self.make_request("POST", "/categories", category_data, token=self.admin_token)
        if response and response.status_code == 201:
            data = response.json()
            self.category_id = data.get('id')
            self.log_result("Create Category", True, f"Category created with ID: {self.category_id}")
        else:
            self.log_result("Create Category", False, f"Failed: {response.status_code if response else 'No response'}")
            return False

        # Test UPDATE category
        update_data = {
            "name": "Updated Gaming Category",
            "order": 2
        }
        
        response = self.make_request("PUT", f"/categories/{self.category_id}", update_data, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_result("Update Category", True, "Category updated successfully")
        else:
            self.log_result("Update Category", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test GET all categories (admin)
        response = self.make_request("GET", "/categories/all", token=self.admin_token)
        if response and response.status_code == 200:
            self.log_result("Get All Categories", True, f"Retrieved {len(response.json())} categories (including inactive)")
        else:
            self.log_result("Get All Categories", False, f"Failed: {response.status_code if response else 'No response'}")

        return True

    def test_products_crud(self):
        """Test products CRUD operations"""
        print("\n=== Testing Products CRUD ===")
        
        # Test GET products (public)
        response = self.make_request("GET", "/products")
        if response and response.status_code == 200:
            self.log_result("Get Products", True, f"Retrieved {len(response.json())} products")
        else:
            self.log_result("Get Products", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test CREATE product (admin only)
        product_data = {
            "name": "Steam Digital Code",
            "description": "Digital gaming code for Steam platform",
            "price": 25.99,
            "originalPrice": 29.99,
            "discount": 13,
            "categoryId": self.category_id,
            "image": "",
            "active": True,
            "featured": True
        }
        
        response = self.make_request("POST", "/products", product_data, token=self.admin_token)
        if response and response.status_code == 201:
            data = response.json()
            self.product_id = data.get('id')
            self.log_result("Create Product", True, f"Product created with ID: {self.product_id}")
        else:
            self.log_result("Create Product", False, f"Failed: {response.status_code if response else 'No response'}")
            return False

        # Test GET single product
        response = self.make_request("GET", f"/products/{self.product_id}")
        if response and response.status_code == 200:
            data = response.json()
            stock = data.get('stock', 0)
            self.log_result("Get Product Details", True, f"Product details retrieved, stock: {stock}")
        else:
            self.log_result("Get Product Details", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test UPDATE product
        update_data = {
            "price": 22.99,
            "description": "Updated description for Steam digital code"
        }
        
        response = self.make_request("PUT", f"/products/{self.product_id}", update_data, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_result("Update Product", True, "Product updated successfully")
        else:
            self.log_result("Update Product", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test product search and filtering
        response = self.make_request("GET", "/products?search=Steam")
        if response and response.status_code == 200:
            results = response.json()
            self.log_result("Search Products", True, f"Search returned {len(results)} results")
        else:
            self.log_result("Search Products", False, f"Failed: {response.status_code if response else 'No response'}")

        return True

    def test_code_inventory(self):
        """Test code inventory management"""
        print("\n=== Testing Code Inventory Management ===")
        
        # Test ADD codes to product (admin only)
        codes_data = {
            "productId": self.product_id,
            "codes": [
                "STEAM-CODE-001-ABCD",
                "STEAM-CODE-002-EFGH", 
                "STEAM-CODE-003-IJKL",
                "STEAM-CODE-004-MNOP",
                "STEAM-CODE-005-QRST"
            ]
        }
        
        response = self.make_request("POST", "/codes", codes_data, token=self.admin_token)
        if response and response.status_code == 201:
            data = response.json()
            added_count = data.get('added', 0)
            self.log_result("Add Product Codes", True, f"Added {added_count} codes to product")
        else:
            self.log_result("Add Product Codes", False, f"Failed: {response.status_code if response else 'No response'}")
            return False

        # Test GET codes by product (admin only)
        response = self.make_request("GET", f"/codes?productId={self.product_id}", token=self.admin_token)
        if response and response.status_code == 200:
            codes = response.json()
            available_codes = [c for c in codes if c.get('status') == 'available']
            self.log_result("Get Product Codes", True, f"Retrieved {len(codes)} total codes, {len(available_codes)} available")
        else:
            self.log_result("Get Product Codes", False, f"Failed: {response.status_code if response else 'No response'}")

        return True

    def test_order_flow(self):
        """Test complete order flow with auto-delivery"""
        print("\n=== Testing Order Flow with Auto-Delivery ===")
        
        # Test CREATE order (user)
        order_data = {
            "items": [
                {
                    "productId": self.product_id,
                    "quantity": 2
                }
            ]
        }
        
        response = self.make_request("POST", "/orders", order_data, token=self.user_token)
        if response and response.status_code == 201:
            data = response.json()
            self.order_id = data.get('id')
            status = data.get('status')
            items = data.get('items', [])
            delivered_codes = items[0].get('deliveredCodes', []) if items else []
            pending_count = items[0].get('pendingCount', 0) if items else 0
            
            self.log_result("Create Order", True, f"Order created with status: {status}")
            self.log_result("Auto Code Delivery", len(delivered_codes) > 0, 
                          f"Delivered {len(delivered_codes)} codes, {pending_count} pending")
            
            # Verify codes were delivered
            if len(delivered_codes) >= 2:
                self.log_result("Full Order Delivery", True, "All requested codes were delivered automatically")
            elif len(delivered_codes) > 0:
                self.log_result("Partial Order Delivery", True, f"Partial delivery: {len(delivered_codes)}/{2} codes delivered")
            else:
                self.log_result("Order Pending Delivery", True, "Order created but no codes available for immediate delivery")
        else:
            self.log_result("Create Order", False, f"Failed: {response.status_code if response else 'No response'}")
            return False

        # Test GET order details
        response = self.make_request("GET", f"/orders/{self.order_id}", token=self.user_token)
        if response and response.status_code == 200:
            self.log_result("Get Order Details", True, "Order details retrieved successfully")
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

    def test_out_of_stock_scenario(self):
        """Test order when no codes are available (pending delivery)"""
        print("\n=== Testing Out-of-Stock Scenario ===")
        
        # Create a new product without codes
        product_data = {
            "name": "PlayStation Code (No Stock)",
            "description": "Digital code for PlayStation - currently out of stock",
            "price": 50.00,
            "categoryId": self.category_id,
            "active": True
        }
        
        response = self.make_request("POST", "/products", product_data, token=self.admin_token)
        if response and response.status_code == 201:
            no_stock_product_id = response.json().get('id')
            
            # Try to order from product with no stock
            order_data = {
                "items": [
                    {
                        "productId": no_stock_product_id,
                        "quantity": 1
                    }
                ]
            }
            
            response = self.make_request("POST", "/orders", order_data, token=self.user_token)
            if response and response.status_code == 201:
                data = response.json()
                status = data.get('status')
                items = data.get('items', [])
                pending_count = items[0].get('pendingCount', 0) if items else 0
                
                if status == 'pending_delivery' and pending_count > 0:
                    self.log_result("Out-of-Stock Order", True, f"Order correctly marked as pending_delivery with {pending_count} pending codes")
                else:
                    self.log_result("Out-of-Stock Order", False, f"Expected pending_delivery status, got: {status}")
            else:
                self.log_result("Out-of-Stock Order", False, f"Failed: {response.status_code if response else 'No response'}")
        else:
            self.log_result("Out-of-Stock Product Creation", False, "Failed to create test product")

    def test_admin_manual_delivery(self):
        """Test admin manual delivery for pending orders"""
        print("\n=== Testing Admin Manual Delivery ===")
        
        if not self.order_id:
            self.log_result("Manual Delivery Setup", False, "No order ID available for testing")
            return False

        # Test manual delivery by admin
        delivery_data = {
            "action": "deliver",
            "itemIndex": 0,
            "codes": ["MANUAL-CODE-001", "MANUAL-CODE-002"]
        }
        
        response = self.make_request("PUT", f"/orders/{self.order_id}", delivery_data, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_result("Admin Manual Delivery", True, "Admin successfully delivered codes manually")
        else:
            self.log_result("Admin Manual Delivery", False, f"Failed: {response.status_code if response else 'No response'}")

        return True

    def test_reviews(self):
        """Test reviews functionality"""
        print("\n=== Testing Reviews ===")
        
        # Test POST review
        review_data = {
            "productId": self.product_id,
            "rating": 5,
            "comment": "Great product, fast delivery of digital codes!"
        }
        
        response = self.make_request("POST", "/reviews", review_data, token=self.user_token)
        if response and response.status_code == 201:
            self.log_result("Create Review", True, "Review created successfully")
        else:
            self.log_result("Create Review", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test GET reviews by product
        response = self.make_request("GET", f"/reviews?productId={self.product_id}")
        if response and response.status_code == 200:
            reviews = response.json()
            self.log_result("Get Product Reviews", True, f"Retrieved {len(reviews)} reviews")
        else:
            self.log_result("Get Product Reviews", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test duplicate review prevention
        response = self.make_request("POST", "/reviews", review_data, token=self.user_token)
        if response and response.status_code == 400:
            self.log_result("Duplicate Review Prevention", True, "Correctly prevented duplicate review")
        else:
            self.log_result("Duplicate Review Prevention", False, f"Should have prevented duplicate, got: {response.status_code if response else 'No response'}")

    def test_discounts(self):
        """Test discount codes functionality"""
        print("\n=== Testing Discount Codes ===")
        
        # Test CREATE discount (admin only)
        discount_data = {
            "code": "WELCOME10",
            "type": "percentage",
            "value": 10,
            "minOrder": 20,
            "maxUses": 100,
            "active": True
        }
        
        response = self.make_request("POST", "/discounts", discount_data, token=self.admin_token)
        if response and response.status_code == 201:
            self.log_result("Create Discount", True, "Discount code created successfully")
        else:
            self.log_result("Create Discount", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test VALIDATE discount
        validate_data = {"code": "WELCOME10"}
        response = self.make_request("POST", "/discounts/validate", validate_data)
        if response and response.status_code == 200:
            data = response.json()
            if data.get('valid'):
                self.log_result("Validate Discount", True, f"Discount validated: {data.get('type')} {data.get('value')}")
            else:
                self.log_result("Validate Discount", False, "Discount marked as invalid")
        else:
            self.log_result("Validate Discount", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test order with discount
        order_data = {
            "items": [{
                "productId": self.product_id,
                "quantity": 1
            }],
            "discountCode": "WELCOME10"
        }
        
        response = self.make_request("POST", "/orders", order_data, token=self.user_token)
        if response and response.status_code == 201:
            data = response.json()
            discount_amount = data.get('discountAmount', 0)
            applied_discount = data.get('discountCode')
            if discount_amount > 0 and applied_discount:
                self.log_result("Order with Discount", True, f"Discount applied: {discount_amount} with code {applied_discount}")
            else:
                self.log_result("Order with Discount", False, "Discount not applied to order")
        else:
            self.log_result("Order with Discount", False, f"Failed: {response.status_code if response else 'No response'}")

    def test_exchange_rates(self):
        """Test exchange rates endpoint"""
        print("\n=== Testing Exchange Rates ===")
        
        response = self.make_request("GET", "/exchange-rates")
        if response and response.status_code == 200:
            data = response.json()
            rates = data.get('rates', {})
            required_currencies = ['USD', 'SAR', 'KWD', 'AED']
            
            if all(curr in rates for curr in required_currencies):
                self.log_result("Exchange Rates", True, f"All required currencies available: {list(rates.keys())}")
            else:
                self.log_result("Exchange Rates", False, f"Missing currencies. Got: {list(rates.keys())}")
        else:
            self.log_result("Exchange Rates", False, f"Failed: {response.status_code if response else 'No response'}")

    def test_settings(self):
        """Test settings endpoints"""
        print("\n=== Testing Settings ===")
        
        # Test GET settings
        response = self.make_request("GET", "/settings")
        if response and response.status_code == 200:
            self.log_result("Get Settings", True, "Settings retrieved successfully")
        else:
            self.log_result("Get Settings", False, f"Failed: {response.status_code if response else 'No response'}")

        # Test UPDATE settings (admin only)
        settings_data = {
            "siteName": "Digital Gaming Store",
            "contactEmail": "support@digitalstore.test",
            "whatsapp": "+1234567890"
        }
        
        response = self.make_request("PUT", "/settings", settings_data, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_result("Update Settings", True, "Settings updated successfully")
        else:
            self.log_result("Update Settings", False, f"Failed: {response.status_code if response else 'No response'}")

    def test_users_management(self):
        """Test users management (admin only)"""
        print("\n=== Testing Users Management ===")
        
        # Test GET users (admin only)
        response = self.make_request("GET", "/users", token=self.admin_token)
        if response and response.status_code == 200:
            users = response.json()
            self.log_result("Get Users List", True, f"Retrieved {len(users)} users")
        else:
            self.log_result("Get Users List", False, f"Failed: {response.status_code if response else 'No response'}")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n=== Cleaning Up Test Data ===")
        
        # Delete test product (this will also delete its codes)
        if self.product_id:
            response = self.make_request("DELETE", f"/products/{self.product_id}", token=self.admin_token)
            if response and response.status_code == 200:
                self.log_result("Delete Test Product", True, "Test product deleted")
            else:
                self.log_result("Delete Test Product", False, f"Failed: {response.status_code if response else 'No response'}")

        # Delete test category
        if self.category_id:
            response = self.make_request("DELETE", f"/categories/{self.category_id}", token=self.admin_token)
            if response and response.status_code == 200:
                self.log_result("Delete Test Category", True, "Test category deleted")
            else:
                self.log_result("Delete Test Category", False, f"Failed: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Digital Card Store Backend API Tests")
        print("=" * 60)
        
        # Core auth and setup tests
        if not self.test_admin_setup():
            print("❌ Admin setup failed, aborting tests")
            return False
            
        success = True
        success &= self.test_auth_flow()
        success &= self.test_categories_crud()
        success &= self.test_products_crud()
        success &= self.test_code_inventory()
        success &= self.test_order_flow()
        self.test_out_of_stock_scenario()
        self.test_admin_manual_delivery()
        self.test_reviews()
        self.test_discounts()
        self.test_exchange_rates()
        self.test_settings()
        self.test_users_management()
        
        # Cleanup
        self.cleanup_test_data()
        
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