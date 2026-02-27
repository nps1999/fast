# دليل إعداد بيانات الاعتماد / Credentials Setup Guide

## البيانات المطلوب إضافتها في ملف .env

تم تنفيذ جميع التكاملات المطلوبة. لتفعيلها، يرجى إضافة البيانات التالية في ملف `/app/.env`:

---

## 1. تكامل PayPal (بوابة الدفع)

---

## 1. تكامل PayPal (بوابة الدفع)

### الحصول على بيانات PayPal:
1. سجّل الدخول إلى: https://developer.paypal.com/
2. اذهب إلى: Dashboard → My Apps & Credentials
3. اختر "Live" للإنتاج أو "Sandbox" للتجربة
4. انسخ Client ID و Secret

### البيانات المطلوبة:
```env
PAYPAL_CLIENT_ID=your_actual_paypal_client_id_here
PAYPAL_SECRET=your_actual_paypal_secret_here
```

### الميزات:
- ✅ دفع آمن عبر PayPal
- ✅ دعم جميع العملات (USD, SAR, KWD, AED, BHD, QAR, OMR)
- ✅ تحويل تلقائي للعملات حسب سعر الصرف الحالي
- ✅ إعادة توجيه آمنة للمستخدم
- ✅ تأكيد الدفع وتحديث حالة الطلب تلقائياً

---

## 2. تكامل Google OAuth (تسجيل الدخول عبر Google)

### تم استخدام: Emergent Auth
لا يحتاج إلى بيانات اعتماد! التكامل جاهز ويعمل مباشرة.

### الميزات:
- ✅ زر "تسجيل الدخول عبر Google" في صفحة تسجيل الدخول
- ✅ إنشاء حساب تلقائي للمستخدمين الجدد
- ✅ ربط الحسابات الموجودة بـ Google
- ✅ حفظ الصورة الشخصية من Google
- ✅ جلسة آمنة لمدة 7 أيام

---

## 3. تكامل البريد الإلكتروني (SMTP)

### الحصول على بيانات Gmail SMTP:
1. سجّل الدخول إلى حساب Gmail
2. اذهب إلى: https://myaccount.google.com/security
3. فعّل "المصادقة الثنائية" (2-Step Verification)
4. اذهب إلى: "App passwords" (كلمات مرور التطبيقات)
5. أنشئ كلمة مرور تطبيق جديدة واحفظها

### البيانات المطلوبة:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
SMTP_FROM=your_email@gmail.com
```

### الميزات:
- ✅ إرسال رابط إعادة تعيين كلمة المرور
- ✅ إرسال تأكيد الطلب مع الأكواد الرقمية
- ✅ تصميم احترافي بثيم الألعاب
- ✅ دعم اللغة العربية

---

## 4. تكامل Discord Webhook (إشعارات الطلبات)

### الحصول على Discord Webhook URL:
راجع الدليل الكامل في: `/app/DISCORD_WEBHOOK_GUIDE.md`

**خطوات سريعة:**
1. افتح Discord → اختر القناة
2. تعديل القناة → Integrations → Create Webhook
3. Copy Webhook URL

### البيانات المطلوبة:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE
```

### الميزات:
- ✅ إشعار فوري عند كل طلب جديد
- ✅ Embed احترافي مع جميع تفاصيل الطلب
- ✅ معلومات المنتج والسعر والكمية
- ✅ معلومات العميل (الاسم، البريد، الجوال)
- ✅ طريقة الدفع والحالة والتاريخ
- ✅ ألوان مختلفة حسب نوع الطلب

---

## الحالة الحالية

### ✅ جاهز ويعمل بدون بيانات:
- Google OAuth (Emergent Auth)
- كل الميزات الأساسية (المنتجات، السلة، الطلبات، المراجعات)
- تحويل العملات التلقائي
- لوحة التحكم
- إدارة المستخدمين

### ⏳ يحتاج بيانات اعتماد:
- PayPal (يعمل المنطق، يحتاج Client ID و Secret)
- إرسال البريد الإلكتروني (يعمل المنطق، يحتاج بيانات SMTP)

---

## كيفية التحديث:

1. افتح ملف: `/app/.env`
2. استبدل القيم الافتراضية (placeholder) بالبيانات الحقيقية:
   ```env
   # Before (القيم الحالية)
   PAYPAL_CLIENT_ID=your_paypal_client_id
   SMTP_USER=your_email@gmail.com
   
   # After (البيانات الحقيقية)
   PAYPAL_CLIENT_ID=ATz1x2y3...actual_id
   SMTP_USER=store@yourdomain.com
   ```

3. **مهم**: بعد إضافة البيانات، أعد تشغيل الخادم:
   ```bash
   sudo supervisorctl restart nextjs
   ```

---

## نقاط الوصول (API Endpoints) الجديدة:

### PayPal:
- `POST /api/paypal/create-order` - إنشاء طلب دفع PayPal
- `POST /api/paypal/capture-order` - تأكيد الدفع

### Google OAuth:
- `POST /api/google-auth/google-session` - تبادل session_id من Emergent Auth

---

## الاختبار:

### اختبار Google OAuth:
1. اذهب إلى صفحة تسجيل الدخول
2. اضغط على "تسجيل الدخول عبر Google"
3. سجّل الدخول بحساب Google
4. سيتم توجيهك للصفحة الرئيسية تلقائياً

### اختبار PayPal (بعد إضافة البيانات):
1. أضف منتج للسلة
2. اذهب للدفع
3. اختر "PayPal" كطريقة دفع
4. أدخل رقم الواتساب
5. اضغط "الدفع عبر PayPal"
6. سيتم توجيهك لصفحة PayPal
7. أكمل الدفع
8. سيتم توجيهك للطلب مع الأكواد

### اختبار البريد الإلكتروني (بعد إضافة البيانات):
1. اضغط "نسيت كلمة المرور"
2. أدخل البريد الإلكتروني
3. تحقق من صندوق الوارد
4. أو: أنشئ طلب وتحقق من وصول تأكيد الطلب

---

## ملاحظات مهمة:

1. **PayPal Sandbox للاختبار**: استخدم حساب sandbox من PayPal للاختبار قبل الإنتاج
2. **SMTP Gmail**: تأكد من تفعيل "المصادقة الثنائية" وإنشاء "App Password"
3. **Google OAuth**: لا يحتاج أي إعداد إضافي، جاهز للاستخدام
4. **الأمان**: لا تشارك بيانات .env مع أحد

---

## دعم:

إذا واجهت أي مشاكل:
1. تحقق من صحة البيانات في .env
2. تأكد من إعادة تشغيل الخادم بعد التعديل
3. تحقق من السجلات (logs) للأخطاء:
   ```bash
   tail -n 100 /var/log/supervisor/nextjs.out.log
   ```
