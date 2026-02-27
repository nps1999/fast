# 🚀 دليل نشر موقع FAST STORE على خادم Ubuntu

## المتطلبات الأساسية

- خادم Ubuntu 20.04 أو أحدث
- صلاحيات root أو sudo
- اسم نطاق (Domain) يشير إلى خادمك (اختياري للـ SSL)

---

## الخطوة 1️⃣: تحديث النظام وتثبيت المتطلبات

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# تحقق من الإصدار
node --version  # يجب أن يكون 20.x
npm --version

# تثبيت Yarn
sudo npm install -g yarn

# تثبيت MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# تشغيل MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# تثبيت PM2 لإدارة التطبيق
sudo npm install -g pm2

# تثبيت Nginx
sudo apt install -y nginx
```

---

## الخطوة 2️⃣: نقل ملفات المشروع

```bash
# إنشاء مجلد للمشروع
sudo mkdir -p /var/www/faststore
cd /var/www/faststore

# نقل الملفات (من جهازك المحلي)
# استخدم scp أو git clone

# مثال باستخدام scp من جهازك:
# scp -r /app/* user@your-server-ip:/var/www/faststore/

# أو استخدم Git إذا كان المشروع على GitHub:
# git clone https://github.com/your-username/faststore.git .

# تعيين الصلاحيات
sudo chown -R $USER:$USER /var/www/faststore
```

---

## الخطوة 3️⃣: تثبيت الحزم

```bash
cd /var/www/faststore

# تثبيت جميع الحزم المطلوبة
yarn install
```

---

## الخطوة 4️⃣: إعداد ملف البيئة (.env)

```bash
# تعديل ملف .env
nano /var/www/faststore/.env
```

**محتوى ملف .env:**

```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=fast_store

# Server URL (استبدل بنطاقك أو IP)
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# CORS
CORS_ORIGINS=*

# PayPal (أضف بياناتك)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret

# Google OAuth (أضف بياناتك)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Auth Secret
AUTH_SECRET=your_secret_key_here_change_this

# Exchange Rates
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
NEXT_PUBLIC_EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key

# SMTP Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=your_email@gmail.com

# Discord Webhook (اختياري)
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

احفظ الملف: `Ctrl + O` ثم `Enter` ثم `Ctrl + X`

---

## الخطوة 5️⃣: بناء المشروع

```bash
cd /var/www/faststore

# بناء التطبيق للإنتاج
yarn build

# اختبار التشغيل المباشر (اختياري)
yarn start
# إذا عمل بنجاح، أوقفه بـ Ctrl+C
```

---

## الخطوة 6️⃣: تشغيل التطبيق باستخدام PM2

```bash
# إنشاء ملف ecosystem لـ PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'faststore',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/faststore',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# تشغيل التطبيق
pm2 start ecosystem.config.js

# حفظ قائمة التطبيقات
pm2 save

# تشغيل PM2 عند بدء النظام
pm2 startup
# نفذ الأمر الذي يظهر لك

# التحقق من حالة التطبيق
pm2 status
pm2 logs faststore
```

---

## الخطوة 7️⃣: إعداد Nginx كـ Reverse Proxy

```bash
# إنشاء ملف إعدادات Nginx
sudo nano /etc/nginx/sites-available/faststore
```

**محتوى الملف:**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # استبدل بـ IP الخادم إذا لم يكن لديك نطاق
    # server_name your-server-ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # إعدادات إضافية للأداء
    client_max_body_size 50M;
}
```

احفظ الملف وفعّله:

```bash
# تفعيل الإعدادات
sudo ln -s /etc/nginx/sites-available/faststore /etc/nginx/sites-enabled/

# إزالة الإعدادات الافتراضية
sudo rm /etc/nginx/sites-enabled/default

# اختبار إعدادات Nginx
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx

# تفعيل Nginx عند بدء النظام
sudo systemctl enable nginx
```

---

## الخطوة 8️⃣: تأمين الموقع بـ SSL (Let's Encrypt) ⚠️ مهم!

```bash
# تثبيت Certbot
sudo apt install -y certbot python3-certbot-nginx

# الحصول على شهادة SSL (استبدل بنطاقك)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# سيطلب منك:
# 1. إدخال بريدك الإلكتروني
# 2. الموافقة على الشروط
# 3. اختيار توجيه جميع الطلبات إلى HTTPS (اختر 2)

# تجديد الشهادة تلقائياً
sudo certbot renew --dry-run
```

---

## الخطوة 9️⃣: إعداد جدار الحماية

```bash
# السماح بـ HTTP و HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable

# التحقق من حالة الجدار
sudo ufw status
```

---

## ✅ الخطوة 10: التحقق من التشغيل

الآن افتح المتصفح واذهب إلى:
- `http://your-domain.com` أو
- `http://your-server-ip`

يجب أن يعمل الموقع! 🎉

---

## 📋 أوامر مفيدة للإدارة

```bash
# إعادة تشغيل التطبيق
pm2 restart faststore

# إيقاف التطبيق
pm2 stop faststore

# عرض السجلات
pm2 logs faststore

# مراقبة الأداء
pm2 monit

# إعادة تشغيل Nginx
sudo systemctl restart nginx

# التحقق من حالة MongoDB
sudo systemctl status mongod

# عرض سجلات Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 🔄 تحديث الموقع

عند رفع تحديثات جديدة:

```bash
cd /var/www/faststore

# سحب التحديثات (إذا كنت تستخدم Git)
git pull origin main

# تثبيت الحزم الجديدة
yarn install

# بناء المشروع
yarn build

# إعادة تشغيل التطبيق
pm2 restart faststore
```

---

## 🆘 حل المشاكل الشائعة

### المشكلة: التطبيق لا يعمل
```bash
# تحقق من سجلات PM2
pm2 logs faststore --lines 100

# تحقق من المنفذ 3000
sudo netstat -tulpn | grep 3000

# أعد بناء المشروع
cd /var/www/faststore
yarn build
pm2 restart faststore
```

### المشكلة: MongoDB لا يعمل
```bash
# تحقق من حالة MongoDB
sudo systemctl status mongod

# أعد تشغيل MongoDB
sudo systemctl restart mongod

# تحقق من السجلات
sudo tail -f /var/log/mongodb/mongod.log
```

### المشكلة: Nginx لا يعمل
```bash
# تحقق من الإعدادات
sudo nginx -t

# تحقق من حالة Nginx
sudo systemctl status nginx

# أعد تشغيل Nginx
sudo systemctl restart nginx
```

---

## 📦 نسخ احتياطي

```bash
# نسخ احتياطي لقاعدة البيانات
mongodump --db=fast_store --out=/backup/mongodb/$(date +%Y%m%d)

# نسخ احتياطي لملفات المشروع
tar -czf /backup/faststore-$(date +%Y%m%d).tar.gz /var/www/faststore
```

---

## 🎯 ملاحظات مهمة

1. **تغيير AUTH_SECRET**: لا تستخدم القيمة الافتراضية في الإنتاج
2. **أمان MongoDB**: فعّل authentication لـ MongoDB
3. **التحديثات**: حافظ على تحديث Node.js و MongoDB
4. **النسخ الاحتياطي**: اعمل نسخ احتياطية دورية لقاعدة البيانات
5. **المراقبة**: راقب استخدام الموارد والسجلات بانتظام

---

## 📞 دعم إضافي

إذا واجهت أي مشاكل:
1. تحقق من السجلات: `pm2 logs faststore`
2. تحقق من Nginx: `sudo tail -f /var/log/nginx/error.log`
3. تحقق من MongoDB: `sudo systemctl status mongod`

**تم إنشاء هذا الدليل خصيصاً لموقع FAST STORE** 🚀
