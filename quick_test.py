import requests
import uuid

BASE_URL = 'https://digital-key-store.preview.emergentagent.com/api'

# Register user
user_data = {
    'name': 'Test User',
    'email': f'testuser{uuid.uuid4().hex[:6]}@test.com',
    'password': 'test123'
}
resp = requests.post(f'{BASE_URL}/auth/register', json=user_data, timeout=10)
if resp.status_code == 200:
    token = resp.json()['token']
    print('✅ User registered and logged in')
    
    # Get products
    resp = requests.get(f'{BASE_URL}/products', timeout=10)
    products = resp.json()
    if products:
        product_id = products[0]['id']
        print(f'✅ Found product: {products[0].get("name", "N/A")}')
        print(f'   Stock: {products[0].get("stock", 0)} codes')
        
        # Create order
        order_data = {'items': [{'productId': product_id, 'quantity': 1}]}
        resp = requests.post(f'{BASE_URL}/orders', json=order_data, headers={'Authorization': f'Bearer {token}'}, timeout=10)
        if resp.status_code == 201:
            order = resp.json()
            print(f'✅ Order created: {order["id"]}')
            print(f'   Status: {order["status"]}')
            print(f'   Total: ${order["total"]}')
            if order.get('items'):
                item = order['items'][0]
                delivered = len(item.get('deliveredCodes', []))
                pending = item.get('pendingCount', 0)
                print(f'   Delivered codes: {delivered}')
                print(f'   Pending codes: {pending}')
                if order['status'] == 'pending_delivery':
                    print('✅ Auto-delivery working: Order marked as pending (no codes available)')
                elif delivered > 0:
                    print('✅ Auto-delivery working: Codes delivered automatically')
        else:
            print(f'❌ Order creation failed: {resp.status_code}')
    else:
        print('❌ No products found')
else:
    print(f'❌ User registration failed: {resp.status_code}')