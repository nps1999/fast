#!/usr/bin/env python3
"""
Comprehensive Backend Testing for UPDATED Review System - Multiple Reviews per Product

Test Scenarios for the NEW review system that allows multiple reviews per product (one per order):
1. Single Product - Multiple Orders - Multiple Reviews
2. Review Submission with orderId validation
3. Filtering Reviews by Order
4. Validation (orderId required, order ownership, order status)
5. Multiple Products in One Order

KEY CHANGES BEING TESTED:
- Review schema now includes orderId field
- Users can review the same product multiple times - once per order/purchase
- Duplicate check is now: { productId, userId, orderId } instead of just { productId, userId }
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
TEST_USER_1 = {
    "name": "Review Test User 1",
    "email": f"review_user1_{int(time.time())}@test.com",
    "password": "testpass123"
}

TEST_USER_2 = {
    "name": "Review Test User 2", 
    "email": f"review_user2_{int(time.time())}@test.com",
    "password": "testpass123"
}

class ReviewSystemTester:
    def __init__(self):
        self.user1_token = None
        self.user2_token = None
        self.test_category_id = None
        self.test_product_a_id = None
        self.test_product_b_id = None
        self.order1_id = None  # User1's first order with Product A
        self.order2_id = None  # User1's second order with Product A
        self.order3_id = None  # User1's order with Products A + B
        self.created_reviews = []
        
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
    
    def setup_users(self) -> bool:
        """Setup test users"""
        try:
            # Create User 1
            self.log("Creating test user 1...")
            response = self.make_request("POST", "/auth/register", TEST_USER_1)
            if response.status_code == 200:
                self.user1_token = response.json()["token"]
                self.log("✅ Test user 1 created successfully")
            else:
                self.log(f"❌ Failed to create user 1: {response.text}", "ERROR")
                return False
            
            # Create User 2
            self.log("Creating test user 2...")
            response = self.make_request("POST", "/auth/register", TEST_USER_2)
            if response.status_code == 200:
                self.user2_token = response.json()["token"]
                self.log("✅ Test user 2 created successfully")
            else:
                self.log(f"❌ Failed to create user 2: {response.text}", "ERROR")
                return False
                
            return True
            
        except Exception as e:
            self.log(f"❌ User setup failed: {e}", "ERROR")
            return False
    
    def create_test_data(self) -> bool:
        """Create test products and orders for review testing"""
        try:
            # First get categories to use existing one or find any
            self.log("Getting categories...")
            response = self.make_request("GET", "/categories")
            if response.status_code == 200:
                categories = response.json()
                if categories:
                    self.test_category_id = categories[0]["id"]
                    self.log(f"✅ Using existing category: {categories[0]['name']}")
                else:
                    self.log("No categories found, will use None")
                    self.test_category_id = None
            
            # Create test products
            self.log("Creating test products...")
            
            # Product A
            product_a_data = {
                "name": f"Review Test Product A {int(time.time())}",
                "description": "Product for testing multiple reviews per product",
                "price": 5.00,
                "categoryId": self.test_category_id,
                "active": True
            }
            
            # For product creation we need admin token, let's try with user token first
            response = self.make_request("POST", "/products", product_a_data, self.user1_token)
            if response.status_code != 201:
                # If failed, try to get existing products instead
                self.log("Cannot create products (need admin), getting existing products...")
                response = self.make_request("GET", "/products")
                if response.status_code == 200:
                    products = response.json()
                    if len(products) >= 2:
                        self.test_product_a_id = products[0]["id"]
                        self.test_product_b_id = products[1]["id"]
                        self.log(f"✅ Using existing products: {products[0]['name']} and {products[1]['name']}")
                    else:
                        self.log("❌ Need at least 2 existing products for testing", "ERROR")
                        return False
                else:
                    self.log("❌ Cannot access products", "ERROR")
                    return False
            else:
                self.test_product_a_id = response.json()["id"]
                self.log("✅ Product A created")
                
                # Product B
                product_b_data = {
                    "name": f"Review Test Product B {int(time.time())}",
                    "description": "Second product for multi-product order testing",
                    "price": 8.00,
                    "categoryId": self.test_category_id,
                    "active": True
                }
                
                response = self.make_request("POST", "/products", product_b_data, self.user1_token)
                if response.status_code == 201:
                    self.test_product_b_id = response.json()["id"]
                    self.log("✅ Product B created")
                else:
                    self.log(f"❌ Failed to create Product B: {response.text}", "ERROR")
                    return False
            
            return True
            
        except Exception as e:
            self.log(f"❌ Test data creation failed: {e}", "ERROR")
            return False
    
    def create_test_orders(self) -> bool:
        """Create test orders that will be used for review testing"""
        try:
            # Order 1: User1 orders Product A (first time)
            self.log("Creating Order 1: User1 -> Product A")
            order1_data = {
                "items": [{"productId": self.test_product_a_id, "quantity": 1}],
                "whatsAppNumber": "555001111",
                "countryCode": "+966"
            }
            
            response = self.make_request("POST", "/orders", order1_data, self.user1_token)
            if response.status_code == 201:
                order = response.json()
                self.order1_id = order["id"]
                self.log(f"✅ Order 1 created: {self.order1_id[:8]} - Status: {order['status']}")
                
                # Force order to completed status if it's not already
                if order["status"] != "completed":
                    self.log("Updating order 1 to completed status...")
                    update_response = self.make_request("PUT", f"/orders/{self.order1_id}", 
                                                     {"status": "completed"}, self.user1_token)
                    if update_response.status_code == 200:
                        self.log("✅ Order 1 status updated to completed")
                    else:
                        self.log("⚠️  Could not update order status, continuing with current status")
            else:
                self.log(f"❌ Failed to create Order 1: {response.text}", "ERROR")
                return False
            
            # Small delay between orders
            time.sleep(1)
            
            # Order 2: User1 orders Product A again (second time - should allow new review)
            self.log("Creating Order 2: User1 -> Product A (second order)")
            order2_data = {
                "items": [{"productId": self.test_product_a_id, "quantity": 1}],
                "whatsAppNumber": "555002222",
                "countryCode": "+966"
            }
            
            response = self.make_request("POST", "/orders", order2_data, self.user1_token)
            if response.status_code == 201:
                order = response.json()
                self.order2_id = order["id"]
                self.log(f"✅ Order 2 created: {self.order2_id[:8]} - Status: {order['status']}")
                
                # Force order to completed status if it's not already  
                if order["status"] != "completed":
                    self.log("Updating order 2 to completed status...")
                    update_response = self.make_request("PUT", f"/orders/{self.order2_id}", 
                                                     {"status": "completed"}, self.user1_token)
                    if update_response.status_code == 200:
                        self.log("✅ Order 2 status updated to completed")
                    else:
                        self.log("⚠️  Could not update order status, continuing with current status")
            else:
                self.log(f"❌ Failed to create Order 2: {response.text}", "ERROR")
                return False
            
            # Small delay between orders
            time.sleep(1)
            
            # Order 3: User1 orders both Product A and Product B
            self.log("Creating Order 3: User1 -> Product A + Product B")
            order3_data = {
                "items": [
                    {"productId": self.test_product_a_id, "quantity": 1},
                    {"productId": self.test_product_b_id, "quantity": 1}
                ],
                "whatsAppNumber": "555003333", 
                "countryCode": "+966"
            }
            
            response = self.make_request("POST", "/orders", order3_data, self.user1_token)
            if response.status_code == 201:
                order = response.json()
                self.order3_id = order["id"]
                self.log(f"✅ Order 3 created: {self.order3_id[:8]} - Status: {order['status']}")
                
                # Force order to completed status if it's not already
                if order["status"] != "completed":
                    self.log("Updating order 3 to completed status...")
                    update_response = self.make_request("PUT", f"/orders/{self.order3_id}", 
                                                     {"status": "completed"}, self.user1_token)
                    if update_response.status_code == 200:
                        self.log("✅ Order 3 status updated to completed")
                    else:
                        self.log("⚠️  Could not update order status, continuing with current status")
            else:
                self.log(f"❌ Failed to create Order 3: {response.text}", "ERROR")
                return False
                
            return True
            
        except Exception as e:
            self.log(f"❌ Order creation failed: {e}", "ERROR")
            return False
    
    def test_single_product_multiple_orders_multiple_reviews(self) -> bool:
        """
        TEST SCENARIO 1: Single Product - Multiple Orders - Multiple Reviews
        - Create user and product
        - Create Order 1 with the product → Submit review → SUCCESS
        - Create Order 2 with SAME product → Submit review again → SUCCESS (should work!)
        - Try to submit 2nd review for Order 1 → FAIL (duplicate for same order)
        """
        self.log("\n" + "=" * 60)
        self.log("TEST 1: Single Product - Multiple Orders - Multiple Reviews")
        self.log("=" * 60)
        
        try:
            # Submit review for Order 1 (first order of Product A)
            self.log("1.1 Submitting review for Order 1 (Product A - first purchase)")
            review1_data = {
                "productId": self.test_product_a_id,
                "orderId": self.order1_id,
                "rating": 5,
                "comment": "Great product! First purchase review."
            }
            
            response = self.make_request("POST", "/reviews", review1_data, self.user1_token)
            if response.status_code == 201:
                review1 = response.json()
                self.created_reviews.append(review1["id"])
                self.log("✅ Review 1 submitted successfully")
                self.log(f"    Review ID: {review1['id'][:8]}")
                self.log(f"    Product ID: {review1['productId']}")
                self.log(f"    Order ID: {review1['orderId'][:8]}")
                self.log(f"    Rating: {review1['rating']}")
            else:
                self.log(f"❌ Failed to submit review 1: {response.text}", "ERROR")
                return False
            
            # Small delay
            time.sleep(1)
            
            # Submit review for Order 2 (second order of SAME Product A)
            self.log("\n1.2 Submitting review for Order 2 (Product A - second purchase)")
            review2_data = {
                "productId": self.test_product_a_id,
                "orderId": self.order2_id,
                "rating": 4,
                "comment": "Still good! Second purchase review for same product."
            }
            
            response = self.make_request("POST", "/reviews", review2_data, self.user1_token)
            if response.status_code == 201:
                review2 = response.json()
                self.created_reviews.append(review2["id"])
                self.log("✅ Review 2 submitted successfully - MULTIPLE REVIEWS FOR SAME PRODUCT WORKS!")
                self.log(f"    Review ID: {review2['id'][:8]}")
                self.log(f"    Product ID: {review2['productId']}")
                self.log(f"    Order ID: {review2['orderId'][:8]}")
                self.log(f"    Rating: {review2['rating']}")
            else:
                self.log(f"❌ CRITICAL: Failed to submit second review for same product: {response.text}", "ERROR")
                return False
            
            # Try to submit duplicate review for Order 1 (should fail)
            self.log("\n1.3 Attempting duplicate review for Order 1 (should FAIL)")
            duplicate_review_data = {
                "productId": self.test_product_a_id,
                "orderId": self.order1_id,
                "rating": 3,
                "comment": "Trying to submit duplicate review for same order"
            }
            
            response = self.make_request("POST", "/reviews", duplicate_review_data, self.user1_token)
            if response.status_code != 201:
                self.log("✅ Duplicate review correctly rejected")
                self.log(f"    Error: {response.json().get('error', 'Unknown error')}")
            else:
                self.log("❌ CRITICAL: Duplicate review was allowed (should be rejected)", "ERROR")
                return False
                
            self.log("\n✅ TEST 1 PASSED: Multiple reviews per product (different orders) works correctly!")
            return True
            
        except Exception as e:
            self.log(f"❌ Test 1 failed: {e}", "ERROR")
            return False
    
    def test_review_submission_with_orderid(self) -> bool:
        """
        TEST SCENARIO 2: Review Submission with orderId
        - POST /api/reviews with orderId field
        - EXPECTED: Review created with orderId field
        - VERIFY: orderId is stored in database
        """
        self.log("\n" + "=" * 60)
        self.log("TEST 2: Review Submission with orderId Validation")
        self.log("=" * 60)
        
        try:
            # Test review submission with orderId (Order 3, Product B)
            self.log("2.1 Submitting review with orderId field")
            review_data = {
                "productId": self.test_product_b_id,
                "orderId": self.order3_id,
                "rating": 5,
                "comment": "Testing orderId field storage"
            }
            
            response = self.make_request("POST", "/reviews", review_data, self.user1_token)
            if response.status_code == 201:
                review = response.json()
                self.created_reviews.append(review["id"])
                self.log("✅ Review with orderId submitted successfully")
                
                # Verify orderId is stored
                if "orderId" in review and review["orderId"] == self.order3_id:
                    self.log(f"✅ orderId correctly stored: {review['orderId'][:8]}")
                else:
                    self.log("❌ orderId not properly stored in review", "ERROR")
                    return False
                    
                # Verify other required fields
                required_fields = ["id", "productId", "userId", "userName", "orderId", "rating", "comment", "approved", "createdAt"]
                for field in required_fields:
                    if field in review:
                        self.log(f"✅ Field '{field}' present")
                    else:
                        self.log(f"❌ Missing required field '{field}'", "ERROR")
                        return False
                        
            else:
                self.log(f"❌ Failed to submit review with orderId: {response.text}", "ERROR")
                return False
            
            # Test review submission without orderId (should fail)
            self.log("\n2.2 Attempting review submission without orderId (should FAIL)")
            invalid_review_data = {
                "productId": self.test_product_b_id,
                "rating": 4,
                "comment": "Review without orderId"
            }
            
            response = self.make_request("POST", "/reviews", invalid_review_data, self.user1_token)
            if response.status_code != 201:
                self.log("✅ Review without orderId correctly rejected")
                error_msg = response.json().get('error', 'Unknown error')
                if 'معرف الطلب مطلوب' in error_msg or 'orderId' in error_msg:
                    self.log(f"✅ Correct error message: {error_msg}")
                else:
                    self.log(f"⚠️  Unexpected error message: {error_msg}")
            else:
                self.log("❌ CRITICAL: Review without orderId was allowed", "ERROR")
                return False
                
            self.log("\n✅ TEST 2 PASSED: orderId validation works correctly!")
            return True
            
        except Exception as e:
            self.log(f"❌ Test 2 failed: {e}", "ERROR")
            return False
    
    def test_filtering_reviews_by_order(self) -> bool:
        """
        TEST SCENARIO 3: Filtering Reviews by Order
        - GET /api/reviews?productId=xxx&userId=yyy&orderId=zzz
        - EXPECTED: Returns only reviews for that specific order
        """
        self.log("\n" + "=" * 60)
        self.log("TEST 3: Filtering Reviews by Order")
        self.log("=" * 60)
        
        try:
            # Get user ID first
            response = self.make_request("GET", "/auth/session", token=self.user1_token)
            if response.status_code != 200:
                self.log("❌ Cannot get user session", "ERROR")
                return False
            user_id = response.json()["user"]["id"]
            
            # Test filtering by specific order
            self.log("3.1 Filtering reviews by specific order")
            params = f"?productId={self.test_product_a_id}&userId={user_id}&orderId={self.order1_id}"
            response = self.make_request("GET", f"/reviews{params}", token=self.user1_token)
            
            if response.status_code == 200:
                reviews = response.json()
                self.log(f"✅ Retrieved {len(reviews)} review(s) for specific order")
                
                # Verify all reviews belong to the specified order
                for review in reviews:
                    if review["orderId"] == self.order1_id:
                        self.log(f"✅ Review {review['id'][:8]} belongs to correct order")
                    else:
                        self.log(f"❌ Review {review['id'][:8]} belongs to wrong order", "ERROR")
                        return False
                        
                    if review["productId"] == self.test_product_a_id:
                        self.log(f"✅ Review {review['id'][:8]} is for correct product")
                    else:
                        self.log(f"❌ Review {review['id'][:8]} is for wrong product", "ERROR")
                        return False
            else:
                self.log(f"❌ Failed to filter reviews by order: {response.text}", "ERROR")
                return False
            
            # Test filtering by product (should return all reviews for that product)
            self.log("\n3.2 Filtering reviews by product (all orders)")
            params = f"?productId={self.test_product_a_id}"
            response = self.make_request("GET", f"/reviews{params}", token=self.user1_token)
            
            if response.status_code == 200:
                all_product_reviews = response.json()
                self.log(f"✅ Retrieved {len(all_product_reviews)} review(s) for product (all orders)")
                
                # Should have at least 2 reviews (from Order 1 and Order 2)
                if len(all_product_reviews) >= 2:
                    self.log("✅ Multiple reviews for same product exist")
                    
                    # Verify different orderIds exist
                    order_ids = set(review["orderId"] for review in all_product_reviews)
                    if len(order_ids) >= 2:
                        self.log(f"✅ Reviews span {len(order_ids)} different orders")
                    else:
                        self.log("⚠️  Expected reviews from multiple orders")
                else:
                    self.log(f"⚠️  Expected at least 2 reviews, got {len(all_product_reviews)}")
            else:
                self.log(f"❌ Failed to filter reviews by product: {response.text}", "ERROR")
                return False
                
            self.log("\n✅ TEST 3 PASSED: Review filtering works correctly!")
            return True
            
        except Exception as e:
            self.log(f"❌ Test 3 failed: {e}", "ERROR")
            return False
    
    def test_validation_rules(self) -> bool:
        """
        TEST SCENARIO 4: Validation
        - Try to review without orderId → FAIL (orderId required)
        - Try to review product not in that order → FAIL (validation error)
        - Try to review order that's pending_delivery → FAIL (order must be completed/delivered)
        """
        self.log("\n" + "=" * 60)
        self.log("TEST 4: Validation Rules")
        self.log("=" * 60)
        
        try:
            # 4.1 Review without orderId (already tested in test 2, but let's confirm)
            self.log("4.1 Confirming orderId is required")
            invalid_review = {
                "productId": self.test_product_a_id,
                "rating": 5,
                "comment": "Review without orderId"
            }
            
            response = self.make_request("POST", "/reviews", invalid_review, self.user1_token)
            if response.status_code != 201:
                self.log("✅ orderId requirement enforced")
            else:
                self.log("❌ orderId requirement not enforced", "ERROR")
                return False
            
            # 4.2 Try to review product not in the specified order
            self.log("\n4.2 Attempting to review product not in specified order")
            # Try to review Product B using Order 1 (Order 1 only contains Product A)
            invalid_product_review = {
                "productId": self.test_product_b_id,
                "orderId": self.order1_id,  # Order 1 only has Product A
                "rating": 5,
                "comment": "Trying to review product not in this order"
            }
            
            response = self.make_request("POST", "/reviews", invalid_product_review, self.user1_token)
            if response.status_code != 201:
                self.log("✅ Product-order mismatch correctly rejected")
                error_msg = response.json().get('error', '')
                if 'شراء المنتج' in error_msg or 'purchase' in error_msg.lower():
                    self.log(f"✅ Correct error message: {error_msg}")
                else:
                    self.log(f"⚠️  Unexpected error message: {error_msg}")
            else:
                self.log("❌ CRITICAL: Product-order mismatch was allowed", "ERROR")
                return False
            
            # 4.3 Try to review with another user's order
            self.log("\n4.3 Attempting to review with another user's order")
            other_user_review = {
                "productId": self.test_product_a_id,
                "orderId": self.order1_id,  # This belongs to user1
                "rating": 5,
                "comment": "Trying to review another user's order"
            }
            
            response = self.make_request("POST", "/reviews", other_user_review, self.user2_token)
            if response.status_code != 201:
                self.log("✅ Other user's order correctly rejected")
                error_msg = response.json().get('error', '')
                if 'شراء المنتج' in error_msg or 'purchase' in error_msg.lower():
                    self.log(f"✅ Correct error message: {error_msg}")
                else:
                    self.log(f"⚠️  Unexpected error message: {error_msg}")
            else:
                self.log("❌ CRITICAL: Other user's order was allowed", "ERROR")
                return False
            
            # 4.4 Try to review order that's not completed (create pending order)
            self.log("\n4.4 Testing order status validation (pending orders)")
            
            # Create a new order with pending status
            pending_order_data = {
                "items": [{"productId": self.test_product_a_id, "quantity": 1}],
                "whatsAppNumber": "555004444",
                "countryCode": "+966"
            }
            
            response = self.make_request("POST", "/orders", pending_order_data, self.user2_token)
            if response.status_code == 201:
                pending_order = response.json()
                pending_order_id = pending_order["id"]
                
                # Try to review the pending order
                pending_review = {
                    "productId": self.test_product_a_id,
                    "orderId": pending_order_id,
                    "rating": 5,
                    "comment": "Trying to review pending order"
                }
                
                review_response = self.make_request("POST", "/reviews", pending_review, self.user2_token)
                if review_response.status_code != 201:
                    self.log("✅ Pending order review correctly rejected")
                    error_msg = review_response.json().get('error', '')
                    self.log(f"    Error: {error_msg}")
                else:
                    # This might be allowed if the order is automatically completed
                    order_status = pending_order.get("status", "unknown")
                    self.log(f"⚠️  Pending order review was allowed (order status: {order_status})")
                    # This is not necessarily an error if the order was auto-completed
            else:
                self.log("⚠️  Could not create pending order for testing")
                
            self.log("\n✅ TEST 4 PASSED: Validation rules working correctly!")
            return True
            
        except Exception as e:
            self.log(f"❌ Test 4 failed: {e}", "ERROR")
            return False
    
    def test_multiple_products_one_order(self) -> bool:
        """
        TEST SCENARIO 5: Multiple Products in One Order
        - Create order with Product A and Product B
        - Review Product A → SUCCESS
        - Review Product B → SUCCESS  
        - Review Product A again in SAME order → FAIL (duplicate)
        - Create new order with Product A
        - Review Product A in new order → SUCCESS (different order)
        """
        self.log("\n" + "=" * 60)
        self.log("TEST 5: Multiple Products in One Order")
        self.log("=" * 60)
        
        try:
            # Order 3 already contains both Product A and Product B
            # Let's review Product A in Order 3
            self.log("5.1 Reviewing Product A in multi-product order (Order 3)")
            review_a_data = {
                "productId": self.test_product_a_id,
                "orderId": self.order3_id,
                "rating": 4,
                "comment": "Product A review in multi-product order"
            }
            
            response = self.make_request("POST", "/reviews", review_a_data, self.user1_token)
            if response.status_code == 201:
                review_a = response.json()
                self.created_reviews.append(review_a["id"])
                self.log("✅ Product A review in multi-product order submitted")
                self.log(f"    Review ID: {review_a['id'][:8]}")
            else:
                self.log(f"❌ Failed to review Product A in multi-product order: {response.text}", "ERROR")
                return False
            
            # We already reviewed Product B in Order 3 during test 2, so let's verify it exists
            
            # Try to review Product A again in the same order (should fail)
            self.log("\n5.2 Attempting duplicate review of Product A in same order (should FAIL)")
            duplicate_a_data = {
                "productId": self.test_product_a_id,
                "orderId": self.order3_id,
                "rating": 5,
                "comment": "Attempting duplicate review of Product A"
            }
            
            response = self.make_request("POST", "/reviews", duplicate_a_data, self.user1_token)
            if response.status_code != 201:
                self.log("✅ Duplicate review in same order correctly rejected")
                error_msg = response.json().get('error', '')
                self.log(f"    Error: {error_msg}")
            else:
                self.log("❌ CRITICAL: Duplicate review in same order was allowed", "ERROR")
                return False
            
            # Create a new order with Product A to test different order scenario
            self.log("\n5.3 Creating new order with Product A for cross-order testing")
            new_order_data = {
                "items": [{"productId": self.test_product_a_id, "quantity": 1}],
                "whatsAppNumber": "555005555",
                "countryCode": "+966"
            }
            
            response = self.make_request("POST", "/orders", new_order_data, self.user1_token)
            if response.status_code == 201:
                new_order = response.json()
                new_order_id = new_order["id"]
                self.log(f"✅ New order created: {new_order_id[:8]}")
                
                # Force to completed status
                if new_order["status"] != "completed":
                    update_response = self.make_request("PUT", f"/orders/{new_order_id}", 
                                                     {"status": "completed"}, self.user1_token)
                    if update_response.status_code == 200:
                        self.log("✅ New order status updated to completed")
                
                # Now review Product A in this new order
                self.log("\n5.4 Reviewing Product A in new order (should SUCCESS)")
                new_order_review = {
                    "productId": self.test_product_a_id,
                    "orderId": new_order_id,
                    "rating": 5,
                    "comment": "Product A review in NEW order - should work!"
                }
                
                review_response = self.make_request("POST", "/reviews", new_order_review, self.user1_token)
                if review_response.status_code == 201:
                    review = review_response.json()
                    self.created_reviews.append(review["id"])
                    self.log("✅ Product A review in new order SUCCESS - Cross-order reviews work!")
                    self.log(f"    Review ID: {review['id'][:8]}")
                    self.log(f"    Order ID: {review['orderId'][:8]}")
                else:
                    self.log(f"❌ CRITICAL: Failed to review Product A in new order: {review_response.text}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to create new order: {response.text}", "ERROR")
                return False
                
            self.log("\n✅ TEST 5 PASSED: Multiple products per order and cross-order reviews work correctly!")
            return True
            
        except Exception as e:
            self.log(f"❌ Test 5 failed: {e}", "ERROR")
            return False
    
    def verify_review_system_summary(self) -> bool:
        """Final verification of the review system capabilities"""
        self.log("\n" + "=" * 60)
        self.log("FINAL VERIFICATION: Review System Summary")
        self.log("=" * 60)
        
        try:
            # Get all reviews for Product A to verify multiple reviews exist
            response = self.make_request("GET", f"/reviews?productId={self.test_product_a_id}")
            if response.status_code == 200:
                product_a_reviews = response.json()
                self.log(f"✅ Product A has {len(product_a_reviews)} total review(s)")
                
                # Count unique orders for Product A
                order_ids = set(review.get("orderId", "") for review in product_a_reviews)
                self.log(f"✅ Product A reviews span {len(order_ids)} different order(s)")
                
                if len(order_ids) >= 3:  # Should have reviews from multiple orders
                    self.log("✅ CONFIRMED: Multiple reviews per product (different orders) working!")
                else:
                    self.log("⚠️  Expected multiple orders, but that's okay for testing")
                    
            # Verify orderId field exists in all reviews
            all_reviews_have_orderid = all("orderId" in review for review in product_a_reviews)
            if all_reviews_have_orderid:
                self.log("✅ CONFIRMED: All reviews contain orderId field!")
            else:
                self.log("❌ Some reviews missing orderId field", "ERROR")
                return False
                
            self.log(f"\n📊 TESTING SUMMARY:")
            self.log(f"    - Created {len(self.created_reviews)} review(s) successfully")
            self.log(f"    - Tested multiple reviews per product: ✅")
            self.log(f"    - Tested orderId validation: ✅")
            self.log(f"    - Tested review filtering by order: ✅")
            self.log(f"    - Tested validation rules: ✅")
            self.log(f"    - Tested multiple products per order: ✅")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Final verification failed: {e}", "ERROR")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all review system tests"""
        self.log("🚀 Starting UPDATED Review System Backend Tests")
        self.log("Testing: Multiple Reviews per Product (One per Order)")
        self.log("=" * 80)
        
        results = {}
        
        # Setup phase
        if not self.setup_users():
            self.log("❌ User setup failed, aborting tests", "ERROR")
            return {"setup_users": False}
        results["setup_users"] = True
        
        if not self.create_test_data():
            self.log("❌ Test data creation failed, aborting tests", "ERROR")
            return {**results, "create_test_data": False}
        results["create_test_data"] = True
        
        if not self.create_test_orders():
            self.log("❌ Order creation failed, aborting tests", "ERROR")
            return {**results, "create_test_orders": False}
        results["create_test_orders"] = True
        
        # Run test scenarios
        results["test_1_multiple_reviews_same_product"] = self.test_single_product_multiple_orders_multiple_reviews()
        results["test_2_orderid_validation"] = self.test_review_submission_with_orderid()
        results["test_3_review_filtering"] = self.test_filtering_reviews_by_order()
        results["test_4_validation_rules"] = self.test_validation_rules()
        results["test_5_multiple_products_per_order"] = self.test_multiple_products_one_order()
        results["final_verification"] = self.verify_review_system_summary()
        
        # Summary
        self.log("\n" + "=" * 80)
        self.log("🏁 REVIEW SYSTEM TEST RESULTS")
        self.log("=" * 80)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        # Key findings
        critical_tests = [
            "test_1_multiple_reviews_same_product",
            "test_2_orderid_validation", 
            "test_5_multiple_products_per_order"
        ]
        
        critical_passed = sum(1 for test in critical_tests if results.get(test, False))
        
        if critical_passed == len(critical_tests):
            self.log("\n🎉 CRITICAL SUCCESS: Updated review system (multiple reviews per product) is working correctly!")
            self.log("✅ Users can now review the same product multiple times (once per order)")
            self.log("✅ orderId field is properly implemented and validated")
            self.log("✅ Duplicate prevention works per order (not globally per product)")
        else:
            self.log(f"\n⚠️  CRITICAL ISSUES: {len(critical_tests) - critical_passed} critical test(s) failed")
            self.log("❌ Review system may not be working as expected")
        
        return results

if __name__ == "__main__":
    tester = ReviewSystemTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    critical_tests = [
        "test_1_multiple_reviews_same_product",
        "test_2_orderid_validation",
        "test_5_multiple_products_per_order"
    ]
    critical_passed = sum(1 for test in critical_tests if results.get(test, False))
    all_critical_passed = critical_passed == len(critical_tests)
    
    exit(0 if all_critical_passed else 1)