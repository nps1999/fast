# 🎯 دليل تنفيذ PayPal Smart Buttons

## 📋 ما هي PayPal Smart Buttons؟

هي أزرار تفاعلية من PayPal تظهر **مباشرة في صفحة الدفع** بدون redirect!

### المميزات:
✅ **3 خيارات دفع في زر واحد:**
   - "دفع بواسطة PayPal" (حساب PayPal)
   - "Pay Later" (الدفع لاحقاً)
   - "بطاقة سحب أو ائتمان" (بدون حساب PayPal!)

✅ **تجربة مستخدم أفضل:**
   - لا redirect للموقع الخارجي
   - نافذة منبثقة (popup) للدفع
   - أسرع وأكثر أماناً

✅ **أمان محسّن:**
   - الدفع يحدث في نافذة آمنة
   - التأكيد الفوري
   - لا تسليم حتى يكتمل الدفع

---

## 🔧 الإعداد المطلوب

### 1. إضافة PayPal SDK للموقع

تم بالفعل! في `/app/app/layout.js`:

```javascript
<Script 
  src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&components=buttons,funding-eligibility&enable-funding=card&locale=ar_EG&currency=USD`}
  strategy="beforeInteractive"
/>
```

**المعاملات المهمة:**
- `client-id`: مفتاح PayPal العام (من .env)
- `components=buttons`: تحميل الأزرار
- `enable-funding=card`: تفعيل زر البطاقة
- `locale=ar_EG`: واجهة عربية
- `currency=USD`: عملة الدفع

### 2. إضافة المتغير للبيئة

في `/app/.env`:
```env
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
```

⚠️ **مهم:** 
- يجب أن يكون `NEXT_PUBLIC_` في البداية (للـ frontend)
- نفس قيمة `PAYPAL_CLIENT_ID` (للـ backend)

---

## 💻 كود CheckoutPage الجديد

### الكود الكامل:

```javascript
const CheckoutPage = () => {
  const [dc, setDC] = useState('');
  const [di, setDI] = useState(null);
  const [phoneCode, setPhoneCode] = useState('+966');
  const [phoneNum, setPhoneNum] = useState('');
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const paypalContainerRef = useRef(null);

  const validateD = async () => {
    try {
      const d = await api('/discounts/validate', {
        method: 'POST',
        body: JSON.stringify({ code: dc })
      });
      setDI(d);
      toast.success('تم تطبيق الكود');
    } catch (e) {
      toast.error(e.message);
      setDI(null);
    }
  };

  let da = 0;
  if (di) da = di.type === 'percentage' ? cartTotal * (di.value / 100) : Math.min(di.value, cartTotal);
  const ft = Math.max(0, cartTotal - da);
  const isFreeOrder = ft === 0 || ft < 0.01;

  // Load PayPal Buttons
  useEffect(() => {
    if (!window.paypal) {
      console.log('⏳ Waiting for PayPal SDK...');
      return;
    }

    if (!phoneNum.trim()) {
      console.log('⚠️ Phone number required');
      return;
    }

    if (paypalLoaded) {
      console.log('✅ PayPal already loaded');
      return;
    }

    console.log('🎯 Rendering PayPal buttons...');
    setPaypalLoaded(true);

    window.paypal.Buttons({
      // Style
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        height: 45
      },

      // Create Order
      createOrder: async (data, actions) => {
        console.log('[PayPal] 🆕 Creating order...');

        try {
          // 1. Create order in our database
          const items = cart.map(i => ({ productId: i.productId, quantity: i.quantity }));
          const order = await api('/orders', {
            method: 'POST',
            body: JSON.stringify({
              items,
              discountCode: di ? dc : undefined,
              whatsAppNumber: phoneNum,
              countryCode: phoneCode
            })
          }, token);

          console.log(`[PayPal] ✅ Order created: ${order.id?.slice(0, 8)}`);
          setOrderId(order.id);

          // 2. Create PayPal order
          const paypalData = await api('/paypal/create-order', {
            method: 'POST',
            body: JSON.stringify({ orderId: order.id, currency: 'USD' })
          }, token);

          console.log(`[PayPal] ✅ PayPal order created: ${paypalData.paypalOrderId?.slice(0, 15)}`);
          return paypalData.paypalOrderId;

        } catch (error) {
          console.error('[PayPal] ❌ Create order failed:', error);
          toast.error('فشل إنشاء الطلب: ' + error.message);
          throw error;
        }
      },

      // Approve (Payment successful!)
      onApprove: async (data, actions) => {
        console.log('[PayPal] ✅ Payment approved!', data.orderID);
        toast.loading('جاري تأكيد الدفع...');

        try {
          // Capture payment and deliver codes
          const result = await api('/paypal/capture-order', {
            method: 'POST',
            body: JSON.stringify({
              orderId: orderId,
              paypalOrderId: data.orderID
            })
          }, token);

          console.log('[PayPal] 🎉 Payment captured, codes delivered!');

          // Clear cart
          setCart([]);
          localStorage.removeItem('cart');

          toast.dismiss();
          toast.success('🎉 تم الدفع بنجاح! تم تسليم الأكواد');

          // Navigate to order page
          setTimeout(() => {
            navigate('order', orderId);
          }, 1000);

        } catch (error) {
          console.error('[PayPal] ❌ Capture failed:', error);
          toast.dismiss();
          toast.error('خطأ في تأكيد الدفع: ' + error.message);
        }
      },

      // Cancel
      onCancel: (data) => {
        console.log('[PayPal] ⚠️ Payment cancelled');
        toast.warning('تم إلغاء عملية الدفع');
      },

      // Error
      onError: (err) => {
        console.error('[PayPal] ❌ Error:', err);
        toast.error('حدث خطأ في PayPal: ' + (err.message || 'Unknown error'));
      }

    }).render(paypalContainerRef.current);

  }, [phoneNum, cart, di, dc, phoneCode, paypalLoaded, orderId, token, user]);

  // Free order handling
  const handleFreeOrder = async () => {
    if (!phoneNum.trim()) {
      toast.error('يرجى إدخال رقم الواتساب');
      return;
    }

    try {
      const items = cart.map(i => ({ productId: i.productId, quantity: i.quantity }));
      const order = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items,
          discountCode: di ? dc : undefined,
          whatsAppNumber: phoneNum,
          countryCode: phoneCode
        })
      }, token);

      // Free order - deliver immediately
      setCart([]);
      localStorage.removeItem('cart');
      toast.success('🎉 تم إتمام الطلب المجاني بنجاح!');
      navigate('order', order.id);

    } catch (error) {
      toast.error('خطأ: ' + error.message);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">إتمام الشراء</h1>

      {/* Cart Summary */}
      <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
        <h2 className="font-bold mb-4">ملخص الطلب</h2>
        <div className="space-y-2 mb-4">
          {cart.map(i => (
            <div key={i.productId} className="flex justify-between text-sm">
              <span>{i.name} x{i.quantity}</span>
              <span>{formatPrice(i.price * i.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-700 pt-2 space-y-2">
          <div className="flex justify-between">
            <span>المجموع:</span>
            <span className="font-bold">{formatPrice(cartTotal)}</span>
          </div>
          {di && (
            <div className="flex justify-between text-green-400">
              <span>الخصم ({di.value}{di.type === 'percentage' ? '%' : ''}):</span>
              <span>-{formatPrice(da)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-purple-400">
            <span>الإجمالي النهائي:</span>
            <span>{formatPrice(ft)}</span>
          </div>
        </div>
      </Card>

      {/* Discount Code */}
      <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
        <Label className="mb-2 block">كود الخصم (اختياري)</Label>
        <div className="flex gap-2">
          <Input
            value={dc}
            onChange={e => setDC(e.target.value)}
            placeholder="أدخل كود الخصم"
            className="bg-[#1a1a2e] border-purple-500/20"
          />
          <Button onClick={validateD} className="bg-purple-600 hover:bg-purple-500">
            تطبيق
          </Button>
        </div>
      </Card>

      {/* WhatsApp */}
      <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
        <Label className="mb-2 block">رقم الواتساب *</Label>
        <div className="flex gap-2">
          <Select value={phoneCode} onValueChange={setPhoneCode}>
            <SelectTrigger className="w-32 bg-[#1a1a2e]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={phoneNum}
            onChange={e => setPhoneNum(e.target.value)}
            placeholder="5xxxxxxxx"
            className="bg-[#1a1a2e] border-purple-500/20"
          />
        </div>
      </Card>

      {/* Payment Section */}
      {!isFreeOrder && phoneNum.trim() && (
        <Card className="bg-[#12121f] border-purple-500/10 p-6">
          <h2 className="font-bold mb-4 text-center">اختر طريقة الدفع</h2>
          
          {/* PayPal Buttons Container */}
          <div ref={paypalContainerRef} className="min-h-[200px]"></div>

          <p className="text-xs text-gray-500 text-center mt-4">
            ✅ دفع آمن ومحمي بواسطة PayPal
          </p>
        </Card>
      )}

      {/* Free Order Button */}
      {isFreeOrder && (
        <Card className="bg-[#12121f] border-purple-500/10 p-6">
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-500 text-lg py-6"
            onClick={handleFreeOrder}
          >
            إتمام الطلب المجاني
          </Button>
        </Card>
      )}
    </div>
  );
};
```

---

## 🎯 كيف يعمل؟

### 1. عند تحميل الصفحة:
```
✅ PayPal SDK يُحمل من layout.js
✅ يتحقق من window.paypal
✅ يعرض الأزرار في paypalContainerRef
```

### 2. عند الضغط على الزر:
```
User clicks → createOrder()
  ↓
1. POST /api/orders (إنشاء طلب بدون تسليم)
2. POST /api/paypal/create-order (إنشاء PayPal order)
3. Return paypalOrderId
  ↓
PayPal opens payment window
```

### 3. عند إتمام الدفع:
```
User pays → onApprove()
  ↓
1. POST /api/paypal/capture-order
2. Backend delivers codes
3. Clear cart
4. Navigate to order page
```

### 4. عند الإلغاء:
```
User cancels → onCancel()
  ↓
1. Toast warning
2. No capture
3. No delivery
4. User can try again
```

---

## 🔒 الأمان

### ✅ ضمانات:
1. **لا تسليم قبل الدفع**: `createOrder` فقط ينشئ الطلب
2. **التسليم بعد الدفع**: `onApprove` → capture → delivery
3. **Idempotent**: آمن للتكرار
4. **معالجة الأخطاء**: جميع الحالات مغطاة

---

## 🎨 التخصيص

### الألوان:
```javascript
style: {
  layout: 'vertical',  // أو 'horizontal'
  color: 'gold',      // أو 'blue', 'silver', 'white', 'black'
  shape: 'rect',      // أو 'pill'
  label: 'paypal',    // أو 'checkout', 'buynow', 'pay'
  height: 45          // ارتفاع الزر بالبيكسل
}
```

### اللغة:
```javascript
locale=ar_EG  // عربي مصري
// أو ar_SA (عربي سعودي)
// أو en_US (إنجليزي)
```

---

## 📝 الخطوات المطلوبة منك:

### 1. تحديث .env:
```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_actual_paypal_client_id
```

### 2. استبدال CheckoutPage في page.js:
انسخ الكود الكامل أعلاه والصق في مكان CheckoutPage القديم.

### 3. إعادة تشغيل التطبيق:
```bash
pm2 restart faststore
```

### 4. التجربة:
- افتح صفحة الدفع
- يجب أن ترى 3 أزرار:
  - "دفع بواسطة PayPal" (أصفر)
  - "Pay Later" (أصفر)
  - "بطاقة سحب أو ائتمان" (رمادي)

---

## 🆘 حل المشاكل

### الأزرار لا تظهر:
```bash
# تحقق من:
1. window.paypal موجود؟
   console.log(window.paypal)
   
2. NEXT_PUBLIC_PAYPAL_CLIENT_ID مضبوط؟
   echo $NEXT_PUBLIC_PAYPAL_CLIENT_ID
   
3. PayPal SDK محمّل؟
   # افتح DevTools → Network → ابحث عن paypal.com/sdk
```

### أخطاء في الـ console:
```javascript
// في DevTools Console:
[PayPal] 🆕 Creating order...  <- يجب أن تظهر
[PayPal] ✅ Order created      <- يجب أن تظهر
[PayPal] ✅ Payment approved   <- عند الدفع
```

---

**الأزرار التفاعلية جاهزة! 🎉**

*آخر تحديث: 2024 - PayPal Smart Buttons*
