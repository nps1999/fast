import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';

// ============ SECURITY: RATE LIMITER ============
const rateLimitMap = new Map();
function rateLimit(ip, limit = 120, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + windowMs; }
  record.count++;
  rateLimitMap.set(ip, record);
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) { if (now > val.resetAt) rateLimitMap.delete(key); }
  }
  return record.count <= limit;
}

// ============ EMAIL ============
let transporter = null;
function getMailer() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com') return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendMail(to, subject, html) {
  const mailer = getMailer();
  if (!mailer) { console.log('Mail not configured, skipping:', subject); return false; }
  try {
    await mailer.sendMail({
      from: `"FAST STORE" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to, subject, html,
    });
    return true;
  } catch (e) { console.error('Email error:', e.message); return false; }
}

function orderEmailHtml(order, settings) {
  const logo = settings?.logo ? `<img src="${process.env.NEXT_PUBLIC_BASE_URL}${settings.logo}" alt="Logo" style="height:50px;margin-bottom:16px;" />` : '';
  const siteName = settings?.siteName || 'FAST STORE';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const itemsHtml = order.items.map(item => {
    const codesHtml = item.deliveredCodes?.length > 0
      ? item.deliveredCodes.map(c => `<div style="background:#1a1a2e;padding:8px 12px;border-radius:6px;margin:4px 0;font-family:monospace;color:#22d3ee;font-size:14px;">${c}</div>`).join('')
      : item.pendingCount > 0 ? `<div style="color:#f59e0b;padding:8px;">⏳ ${item.pendingCount} كود بانتظار التسليم</div>` : '';
    return `<tr><td style="padding:12px;border-bottom:1px solid #2d2d44;">${item.productName}</td><td style="padding:12px;border-bottom:1px solid #2d2d44;text-align:center;">${item.quantity}</td><td style="padding:12px;border-bottom:1px solid #2d2d44;text-align:left;">$${item.price?.toFixed(2)}</td></tr>${codesHtml ? `<tr><td colspan="3" style="padding:8px 12px;">${codesHtml}</td></tr>` : ''}`;
  }).join('');

  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Tahoma,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#0f0f23;border:1px solid rgba(139,92,246,0.2);border-radius:12px;overflow:hidden;">
<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center;border-bottom:2px solid rgba(139,92,246,0.3);">
${logo}<h1 style="color:#fff;margin:0;font-size:24px;text-shadow:0 0 10px rgba(139,92,246,0.5);">${siteName}</h1>
<p style="color:#8b5cf6;margin:8px 0 0;font-size:14px;">تأكيد الطلب</p></div>
<div style="padding:24px;">
<div style="background:#1a1a2e;border-radius:8px;padding:16px;margin-bottom:20px;">
<p style="color:#a0a0b0;margin:0 0 8px;">رقم الطلب: <span style="color:#8b5cf6;font-weight:bold;">#${order.id?.slice(0,8)}</span></p>
<p style="color:#a0a0b0;margin:0;">التاريخ: <span style="color:#fff;">${new Date(order.createdAt).toLocaleString('ar')}</span></p></div>
<table style="width:100%;border-collapse:collapse;color:#e2e8f0;margin-bottom:20px;">
<thead><tr style="background:#1a1a2e;"><th style="padding:12px;text-align:right;color:#8b5cf6;">المنتج</th><th style="padding:12px;text-align:center;color:#8b5cf6;">الكمية</th><th style="padding:12px;text-align:left;color:#8b5cf6;">السعر</th></tr></thead>
<tbody>${itemsHtml}</tbody></table>
${order.discountCode ? `<p style="color:#22c55e;margin-bottom:8px;">كود الخصم: ${order.discountCode} (-$${order.discountAmount?.toFixed(2)})</p>` : ''}
<div style="background:linear-gradient(135deg,rgba(139,92,246,0.1),rgba(34,211,238,0.1));border:1px solid rgba(139,92,246,0.3);border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">
<p style="color:#a0a0b0;margin:0 0 4px;">الإجمالي</p>
<p style="color:#8b5cf6;font-size:28px;font-weight:900;margin:0;">$${order.total?.toFixed(2)}</p></div>
<div style="text-align:center;">
<a href="${baseUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">عرض الطلب</a></div></div>
<div style="background:#0a0a15;padding:16px;text-align:center;color:#666;font-size:12px;">
<p style="margin:0;">${siteName} - جميع الحقوق محفوظة &copy; ${new Date().getFullYear()}</p></div></div></body></html>`;
}

function resetEmailHtml(resetUrl, settings) {
  const siteName = settings?.siteName || 'FAST STORE';
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Tahoma,sans-serif;">
<div style="max-width:500px;margin:0 auto;background:#0f0f23;border:1px solid rgba(139,92,246,0.2);border-radius:12px;overflow:hidden;">
<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">${siteName}</h1></div>
<div style="padding:30px;text-align:center;">
<h2 style="color:#e2e8f0;margin-bottom:16px;">إعادة تعيين كلمة المرور</h2>
<p style="color:#a0a0b0;margin-bottom:24px;">اضغط على الزر أدناه لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة.</p>
<a href="${resetUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;">إعادة تعيين كلمة المرور</a>
<p style="color:#666;font-size:12px;margin-top:20px;">إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة.</p></div></div></body></html>`;
}

// ============ EXCHANGE RATES CACHE ============
let cachedRates = null;
let ratesCacheTime = 0;

async function getExchangeRates() {
  const now = Date.now();
  if (cachedRates && (now - ratesCacheTime) < 3600000) return cachedRates;
  try {
    const key = process.env.EXCHANGE_RATE_API_KEY;
    if (!key) return { USD:1, SAR:3.75, KWD:0.31, AED:3.67, BHD:0.376, QAR:3.64, OMR:0.385 };
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/USD`);
    const data = await response.json();
    if (data.result === 'success') { cachedRates = data.conversion_rates; ratesCacheTime = now; return cachedRates; }
  } catch (e) { console.error('Exchange rate error:', e); }
  return cachedRates || { USD:1, SAR:3.75, KWD:0.31, AED:3.67, BHD:0.376, QAR:3.64, OMR:0.385 };
}

// ============ DATABASE ============
let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  cachedDb = client.db(process.env.DB_NAME || 'fast_store');
  cachedClient = client;
  try {
    await cachedDb.collection('users').createIndex({ email: 1 }, { unique: true });
    await cachedDb.collection('sessions').createIndex({ token: 1 });
    await cachedDb.collection('codes').createIndex({ productId: 1, status: 1 });
    await cachedDb.collection('products').createIndex({ categoryId: 1 });
    await cachedDb.collection('orders').createIndex({ userId: 1 });
    await cachedDb.collection('password_resets').createIndex({ token: 1 });
    await cachedDb.collection('password_resets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  } catch (e) {}
  return cachedDb;
}

// ============ HELPERS ============
function hashPw(p) { return crypto.createHash('sha256').update(p + (process.env.AUTH_SECRET || 'salt')).digest('hex'); }
function res(data, status = 200) { return NextResponse.json(data, { status }); }

async function getUser(request, db) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.split(' ')[1];
  const session = await db.collection('sessions').findOne({ token });
  if (!session) return null;
  const user = await db.collection('users').findOne({ id: session.userId });
  if (user?.banned) return null;
  return user;
}

// ============ AUTH ============
async function handleAuth(path, method, request, db) {
  const action = path[0];

  if (action === 'check-admin' && method === 'GET') {
    const admin = await db.collection('users').findOne({ role: 'admin' });
    return res({ hasAdmin: !!admin });
  }

  if (action === 'setup-admin' && method === 'POST') {
    const existing = await db.collection('users').findOne({ role: 'admin' });
    if (existing) return res({ error: 'يوجد مدير بالفعل' }, 400);
    const body = await request.json();
    if (!body.email || !body.password || !body.name) return res({ error: 'جميع الحقول مطلوبة' }, 400);
    const user = { id: uuidv4(), email: body.email, name: body.name, password: hashPw(body.password), role: 'admin', banned: false, phone: '', countryCode: '', createdAt: new Date() };
    await db.collection('users').insertOne(user);
    const token = uuidv4();
    await db.collection('sessions').insertOne({ token, userId: user.id, createdAt: new Date() });
    const { password: _, ...safeUser } = user;
    return res({ user: safeUser, token });
  }

  if (action === 'register' && method === 'POST') {
    const body = await request.json();
    if (!body.email || !body.password || !body.name) return res({ error: 'جميع الحقول مطلوبة' }, 400);
    const exists = await db.collection('users').findOne({ email: body.email });
    if (exists) return res({ error: 'البريد الإلكتروني مستخدم بالفعل' }, 400);
    const user = { id: uuidv4(), email: body.email, name: body.name, password: hashPw(body.password), role: 'user', banned: false, phone: '', countryCode: '', createdAt: new Date() };
    await db.collection('users').insertOne(user);
    const token = uuidv4();
    await db.collection('sessions').insertOne({ token, userId: user.id, createdAt: new Date() });
    const { password: _, ...safeUser } = user;
    return res({ user: safeUser, token });
  }

  if (action === 'login' && method === 'POST') {
    const body = await request.json();
    const user = await db.collection('users').findOne({ email: body.email, password: hashPw(body.password) });
    if (!user) return res({ error: 'بيانات الدخول غير صحيحة' }, 401);
    if (user.banned) return res({ error: 'تم حظر حسابك' }, 403);
    const token = uuidv4();
    await db.collection('sessions').insertOne({ token, userId: user.id, createdAt: new Date() });
    const { password: _, ...safeUser } = user;
    return res({ user: safeUser, token });
  }

  if (action === 'session' && method === 'GET') {
    const user = await getUser(request, db);
    if (!user) return res({ user: null });
    const { password: _, ...safeUser } = user;
    return res({ user: safeUser });
  }

  if (action === 'logout' && method === 'POST') {
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) await db.collection('sessions').deleteOne({ token: auth.split(' ')[1] });
    return res({ success: true });
  }

  // Profile update
  if (action === 'profile' && method === 'PUT') {
    const user = await getUser(request, db);
    if (!user) return res({ error: 'غير مصرح' }, 401);
    const body = await request.json();
    const updates = {};
    if (body.name) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.countryCode !== undefined) updates.countryCode = body.countryCode;
    if (body.email && body.email !== user.email) {
      const exists = await db.collection('users').findOne({ email: body.email });
      if (exists) return res({ error: 'البريد الإلكتروني مستخدم' }, 400);
      updates.email = body.email;
    }
    await db.collection('users').updateOne({ id: user.id }, { $set: updates });
    const updated = await db.collection('users').findOne({ id: user.id });
    const { password: _, ...safeUser } = updated;
    return res({ user: safeUser });
  }

  // Change password
  if (action === 'change-password' && method === 'POST') {
    const user = await getUser(request, db);
    if (!user) return res({ error: 'غير مصرح' }, 401);
    const body = await request.json();
    if (!body.currentPassword || !body.newPassword) return res({ error: 'جميع الحقول مطلوبة' }, 400);
    if (user.password !== hashPw(body.currentPassword)) return res({ error: 'كلمة المرور الحالية غير صحيحة' }, 400);
    await db.collection('users').updateOne({ id: user.id }, { $set: { password: hashPw(body.newPassword) } });
    return res({ success: true });
  }

  // Forgot password
  if (action === 'forgot-password' && method === 'POST') {
    const body = await request.json();
    const user = await db.collection('users').findOne({ email: body.email });
    if (!user) return res({ success: true }); // Don't reveal if email exists
    const resetToken = uuidv4();
    await db.collection('password_resets').insertOne({
      token: resetToken, userId: user.id, email: user.email,
      expiresAt: new Date(Date.now() + 3600000), createdAt: new Date()
    });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const resetUrl = `${baseUrl}?reset=${resetToken}`;
    const settings = await db.collection('settings').findOne({ id: 'main' });
    await sendMail(user.email, 'إعادة تعيين كلمة المرور', resetEmailHtml(resetUrl, settings));
    return res({ success: true });
  }

  // Reset password
  if (action === 'reset-password' && method === 'POST') {
    const body = await request.json();
    const resetDoc = await db.collection('password_resets').findOne({ token: body.token });
    if (!resetDoc || new Date() > new Date(resetDoc.expiresAt)) return res({ error: 'رابط إعادة التعيين غير صالح أو منتهي' }, 400);
    await db.collection('users').updateOne({ id: resetDoc.userId }, { $set: { password: hashPw(body.newPassword) } });
    await db.collection('password_resets').deleteMany({ userId: resetDoc.userId });
    await db.collection('sessions').deleteMany({ userId: resetDoc.userId });
    return res({ success: true });
  }

  return res({ error: 'Not found' }, 404);
}

// ============ CATEGORIES ============
async function handleCategories(path, method, request, db) {
  const user = await getUser(request, db);
  const id = path[0];

  if (method === 'GET' && !id) {
    const cats = await db.collection('categories').find({ active: true }).sort({ order: 1 }).toArray();
    for (const cat of cats) cat.productCount = await db.collection('products').countDocuments({ categoryId: cat.id, active: true });
    return res(cats);
  }
  if (method === 'GET' && id === 'all') {
    const cats = await db.collection('categories').find({}).sort({ order: 1 }).toArray();
    for (const cat of cats) cat.productCount = await db.collection('products').countDocuments({ categoryId: cat.id });
    return res(cats);
  }
  if (method === 'POST') {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    const cat = { id: uuidv4(), name: body.name, image: body.image || '', order: body.order || 0, active: body.active !== false, createdAt: new Date() };
    await db.collection('categories').insertOne(cat);
    return res(cat, 201);
  }
  if (method === 'PUT' && id) {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    const updates = {};
    ['name', 'image', 'order', 'active'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    await db.collection('categories').updateOne({ id }, { $set: updates });
    return res(await db.collection('categories').findOne({ id }));
  }
  if (method === 'DELETE' && id) {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    await db.collection('categories').deleteOne({ id });
    return res({ success: true });
  }
  return res({ error: 'Not found' }, 404);
}

// ============ PRODUCTS ============
async function handleProducts(path, method, request, db) {
  const user = await getUser(request, db);
  const id = path[0];

  if (method === 'GET' && !id) {
    const url = new URL(request.url);
    const filter = {};
    if (!url.searchParams.get('all')) filter.active = true;
    if (url.searchParams.get('categoryId')) filter.categoryId = url.searchParams.get('categoryId');
    if (url.searchParams.get('featured') === 'true') filter.featured = true;
    if (url.searchParams.get('search')) filter.name = { $regex: url.searchParams.get('search'), $options: 'i' };

    const products = await db.collection('products').find(filter).sort({ createdAt: -1 }).toArray();
    const codeCounts = await db.collection('codes').aggregate([{ $match: { status: 'available' } }, { $group: { _id: '$productId', count: { $sum: 1 } } }]).toArray();
    const countMap = {}; codeCounts.forEach(c => { countMap[c._id] = c.count; });
    const reviewStats = await db.collection('reviews').aggregate([{ $match: { approved: true } }, { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]).toArray();
    const reviewMap = {}; reviewStats.forEach(r => { reviewMap[r._id] = { avgRating: Math.round(r.avg * 10) / 10, reviewCount: r.count }; });
    products.forEach(p => { p.stock = countMap[p.id] || 0; p.avgRating = reviewMap[p.id]?.avgRating || 0; p.reviewCount = reviewMap[p.id]?.reviewCount || 0; });
    return res(products);
  }

  if (method === 'GET' && id) {
    const product = await db.collection('products').findOne({ id });
    if (!product) return res({ error: 'المنتج غير موجود' }, 404);
    product.stock = await db.collection('codes').countDocuments({ productId: id, status: 'available' });
    product.reviews = await db.collection('reviews').find({ productId: id, approved: true }).sort({ createdAt: -1 }).toArray();
    const stats = await db.collection('reviews').aggregate([{ $match: { productId: id, approved: true } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]).toArray();
    product.avgRating = stats[0]?.avg ? Math.round(stats[0].avg * 10) / 10 : 0;
    product.reviewCount = stats[0]?.count || 0;
    if (product.categoryId) { const cat = await db.collection('categories').findOne({ id: product.categoryId }); product.categoryName = cat?.name || ''; }
    return res(product);
  }

  if (method === 'POST') {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    const product = {
      id: uuidv4(), name: body.name, description: body.description || '',
      price: parseFloat(body.price) || 0, originalPrice: parseFloat(body.originalPrice) || 0,
      discount: parseFloat(body.discount) || 0, categoryId: body.categoryId || '',
      image: body.image || '', active: body.active !== false, featured: body.featured || false, createdAt: new Date()
    };
    await db.collection('products').insertOne(product);
    return res(product, 201);
  }

  if (method === 'PUT' && id) {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    const updates = {};
    ['name', 'description', 'price', 'originalPrice', 'discount', 'categoryId', 'image', 'active', 'featured'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    ['price', 'originalPrice', 'discount'].forEach(f => { if (updates[f] !== undefined) updates[f] = parseFloat(updates[f]); });
    await db.collection('products').updateOne({ id }, { $set: updates });
    return res(await db.collection('products').findOne({ id }));
  }

  if (method === 'DELETE' && id) {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    await db.collection('products').deleteOne({ id });
    await db.collection('codes').deleteMany({ productId: id });
    return res({ success: true });
  }
  return res({ error: 'Not found' }, 404);
}

// ============ CODES ============
async function handleCodes(path, method, request, db) {
  const user = await getUser(request, db);
  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
  const id = path[0];

  if (method === 'GET') {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    if (!productId) return res({ error: 'productId مطلوب' }, 400);
    return res(await db.collection('codes').find({ productId }).sort({ createdAt: -1 }).toArray());
  }
  if (method === 'POST') {
    const body = await request.json();
    if (!body.productId || !body.codes?.length) return res({ error: 'بيانات غير صحيحة' }, 400);
    const docs = body.codes.filter(c => c.trim()).map(code => ({
      id: uuidv4(), productId: body.productId, code: code.trim(), status: 'available', orderId: null, createdAt: new Date()
    }));
    if (docs.length > 0) await db.collection('codes').insertMany(docs);
    return res({ added: docs.length }, 201);
  }
  if (method === 'DELETE' && id) {
    await db.collection('codes').deleteOne({ id });
    return res({ success: true });
  }
  return res({ error: 'Not found' }, 404);
}

// ============ ORDERS ============
async function handleOrders(path, method, request, db) {
  const user = await getUser(request, db);
  const id = path[0];

  if (method === 'GET' && !id) {
    if (!user) return res({ error: 'غير مصرح' }, 401);
    const filter = user.role === 'admin' ? {} : { userId: user.id };
    return res(await db.collection('orders').find(filter).sort({ createdAt: -1 }).toArray());
  }
  if (method === 'GET' && id) {
    if (!user) return res({ error: 'غير مصرح' }, 401);
    const order = await db.collection('orders').findOne({ id });
    if (!order) return res({ error: 'الطلب غير موجود' }, 404);
    if (user.role !== 'admin' && order.userId !== user.id) return res({ error: 'غير مصرح' }, 403);
    return res(order);
  }

  if (method === 'POST') {
    if (!user) return res({ error: 'يجب تسجيل الدخول أولاً' }, 401);
    const body = await request.json();
    if (!body.items?.length) return res({ error: 'السلة فارغة' }, 400);

    const orderId = uuidv4();
    let subtotal = 0;
    const orderItems = [];
    let hasPending = false;

    for (const item of body.items) {
      const product = await db.collection('products').findOne({ id: item.productId, active: true });
      if (!product) continue;
      let price = product.discount > 0 ? Math.round(product.price * (1 - product.discount / 100) * 100) / 100 : product.price;
      const deliveredCodes = [];
      const qty = item.quantity || 1;
      for (let i = 0; i < qty; i++) {
        const code = await db.collection('codes').findOneAndUpdate(
          { productId: item.productId, status: 'available' },
          { $set: { status: 'sold', orderId, soldAt: new Date() } }
        );
        if (code) deliveredCodes.push(code.code);
      }
      const pendingCount = qty - deliveredCodes.length;
      if (pendingCount > 0) hasPending = true;
      orderItems.push({ productId: product.id, productName: product.name, productImage: product.image, price, quantity: qty, deliveredCodes, pendingCount });
      subtotal += price * qty;
    }

    let discountAmount = 0, appliedDiscount = null;
    if (body.discountCode) {
      const disc = await db.collection('discount_codes').findOne({ code: body.discountCode, active: true });
      if (disc && (!disc.maxUses || disc.currentUses < disc.maxUses)) {
        const notExpired = !disc.expiresAt || new Date(disc.expiresAt) > new Date();
        if (notExpired && subtotal >= (disc.minOrder || 0)) {
          discountAmount = disc.type === 'percentage' ? subtotal * (disc.value / 100) : Math.min(disc.value, subtotal);
          discountAmount = Math.round(discountAmount * 100) / 100;
          appliedDiscount = disc.code;
          await db.collection('discount_codes').updateOne({ id: disc.id }, { $inc: { currentUses: 1 } });
        }
      }
    }

    const total = Math.round((subtotal - discountAmount) * 100) / 100;
    const order = {
      id: orderId, userId: user.id, userEmail: user.email, userName: user.name,
      phone: body.phone || '', countryCode: body.countryCode || '',
      items: orderItems, subtotal, discountCode: appliedDiscount, discountAmount, total,
      status: hasPending ? 'pending_delivery' : 'completed',
      paymentMethod: 'direct', createdAt: new Date()
    };
    await db.collection('orders').insertOne(order);

    // Send confirmation email
    const settings = await db.collection('settings').findOne({ id: 'main' });
    await sendMail(user.email, `تأكيد الطلب #${orderId.slice(0, 8)} - ${settings?.siteName || 'FAST STORE'}`, orderEmailHtml(order, settings));

    return res(order, 201);
  }

  if (method === 'PUT' && id) {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    if (body.action === 'deliver') {
      const order = await db.collection('orders').findOne({ id });
      if (!order) return res({ error: 'الطلب غير موجود' }, 404);
      const itemIdx = body.itemIndex;
      const newCodes = body.codes || [];
      if (itemIdx !== undefined && order.items[itemIdx]) {
        order.items[itemIdx].deliveredCodes.push(...newCodes);
        order.items[itemIdx].pendingCount = Math.max(0, order.items[itemIdx].pendingCount - newCodes.length);
      }
      const allDelivered = order.items.every(i => i.pendingCount === 0);
      const status = allDelivered ? 'delivered' : 'pending_delivery';
      await db.collection('orders').updateOne({ id }, { $set: { items: order.items, status } });

      // Send delivery email
      if (allDelivered) {
        const settings = await db.collection('settings').findOne({ id: 'main' });
        const updatedOrder = await db.collection('orders').findOne({ id });
        await sendMail(order.userEmail, `تم تسليم طلبك #${id.slice(0, 8)}`, orderEmailHtml(updatedOrder, settings));
      }
      return res({ ...order, status });
    }
    if (body.status) await db.collection('orders').updateOne({ id }, { $set: { status: body.status } });
    return res(await db.collection('orders').findOne({ id }));
  }
  return res({ error: 'Not found' }, 404);
}

// ============ REVIEWS (with approval) ============
async function handleReviews(path, method, request, db) {
  const user = await getUser(request, db);
  const id = path[0];

  if (method === 'GET') {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const all = url.searchParams.get('all');
    const approved = url.searchParams.get('approved');

    if (all === 'true' && user?.role === 'admin') {
      return res(await db.collection('reviews').find({}).sort({ createdAt: -1 }).toArray());
    }
    const filter = {};
    if (productId) filter.productId = productId;
    if (approved !== 'false') filter.approved = true;
    return res(await db.collection('reviews').find(filter).sort({ createdAt: -1 }).toArray());
  }

  if (method === 'POST') {
    if (!user) return res({ error: 'يجب تسجيل الدخول' }, 401);
    const body = await request.json();
    if (!body.productId || !body.rating) return res({ error: 'بيانات ناقصة' }, 400);
    // Check if user purchased this product
    const hasPurchased = await db.collection('orders').findOne({
      userId: user.id, 'items.productId': body.productId,
      status: { $in: ['completed', 'delivered'] }
    });
    if (!hasPurchased) return res({ error: 'يجب شراء المنتج أولاً لتتمكن من التقييم' }, 400);
    const existing = await db.collection('reviews').findOne({ productId: body.productId, userId: user.id });
    if (existing) return res({ error: 'لقد قمت بتقييم هذا المنتج مسبقاً' }, 400);
    const review = {
      id: uuidv4(), productId: body.productId, userId: user.id, userName: user.name,
      rating: Math.min(5, Math.max(1, parseInt(body.rating))),
      comment: body.comment || '', approved: false, createdAt: new Date()
    };
    await db.collection('reviews').insertOne(review);
    return res(review, 201);
  }

  if (method === 'PUT' && id) {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    if (body.approved !== undefined) await db.collection('reviews').updateOne({ id }, { $set: { approved: body.approved } });
    return res(await db.collection('reviews').findOne({ id }));
  }

  if (method === 'DELETE' && id) {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    await db.collection('reviews').deleteOne({ id });
    return res({ success: true });
  }
  return res({ error: 'Not found' }, 404);
}

// ============ DISCOUNTS ============
async function handleDiscounts(path, method, request, db) {
  const user = await getUser(request, db);
  const id = path[0];

  if (id === 'validate' && method === 'POST') {
    const body = await request.json();
    const disc = await db.collection('discount_codes').findOne({ code: body.code, active: true });
    if (!disc) return res({ error: 'كود الخصم غير صالح' }, 400);
    if (disc.maxUses && disc.currentUses >= disc.maxUses) return res({ error: 'كود الخصم منتهي الاستخدام' }, 400);
    if (disc.expiresAt && new Date(disc.expiresAt) < new Date()) return res({ error: 'كود الخصم منتهي الصلاحية' }, 400);
    return res({ valid: true, type: disc.type, value: disc.value, minOrder: disc.minOrder });
  }

  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);

  if (method === 'GET') return res(await db.collection('discount_codes').find({}).sort({ createdAt: -1 }).toArray());

  if (method === 'POST') {
    const body = await request.json();
    const disc = {
      id: uuidv4(), code: body.code, type: body.type || 'percentage',
      value: parseFloat(body.value) || 0, minOrder: parseFloat(body.minOrder) || 0,
      maxUses: parseInt(body.maxUses) || 0, currentUses: 0,
      active: body.active !== false, expiresAt: body.expiresAt || null, createdAt: new Date()
    };
    await db.collection('discount_codes').insertOne(disc);
    return res(disc, 201);
  }

  if (method === 'PUT' && id) {
    const body = await request.json();
    const updates = {};
    ['code', 'type', 'value', 'minOrder', 'maxUses', 'active', 'expiresAt'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    if (updates.value !== undefined) updates.value = parseFloat(updates.value);
    if (updates.minOrder !== undefined) updates.minOrder = parseFloat(updates.minOrder);
    if (updates.maxUses !== undefined) updates.maxUses = parseInt(updates.maxUses);
    await db.collection('discount_codes').updateOne({ id }, { $set: updates });
    return res(await db.collection('discount_codes').findOne({ id }));
  }

  if (method === 'DELETE' && id) {
    await db.collection('discount_codes').deleteOne({ id });
    return res({ success: true });
  }
  return res({ error: 'Not found' }, 404);
}

// ============ SETTINGS ============
async function handleSettings(path, method, request, db) {
  if (method === 'GET') {
    let settings = await db.collection('settings').findOne({ id: 'main' });
    if (!settings) {
      settings = {
        id: 'main', siteName: 'FAST STORE', logo: '', favicon: '', ogImage: '',
        primaryColor: '#8b5cf6', secondaryColor: '#22d3ee',
        contactEmail: '', contactPhone: '', whatsapp: '', discord: '', telegram: '',
        heroTitle: '', heroSubtitle: '', footerText: 'جميع الحقوق محفوظة',
        currencies: ['USD', 'SAR', 'KWD', 'AED', 'BHD', 'QAR', 'OMR'], defaultCurrency: 'USD'
      };
      await db.collection('settings').insertOne(settings);
    }
    return res(settings);
  }
  if (method === 'PUT') {
    const user = await getUser(request, db);
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    const updates = {};
    ['siteName', 'logo', 'favicon', 'ogImage', 'primaryColor', 'secondaryColor', 'contactEmail', 'contactPhone', 'whatsapp', 'discord', 'telegram', 'heroTitle', 'heroSubtitle', 'footerText', 'currencies', 'defaultCurrency'].forEach(f => {
      if (body[f] !== undefined) updates[f] = body[f];
    });
    await db.collection('settings').updateOne({ id: 'main' }, { $set: updates }, { upsert: true });
    return res(await db.collection('settings').findOne({ id: 'main' }));
  }
  return res({ error: 'Not found' }, 404);
}

// ============ USERS ============
async function handleUsers(path, method, request, db) {
  const user = await getUser(request, db);
  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
  const id = path[0];
  if (method === 'GET') return res(await db.collection('users').find({}).project({ password: 0 }).sort({ createdAt: -1 }).toArray());
  if (method === 'PUT' && id) {
    const body = await request.json();
    const updates = {};
    if (body.role !== undefined) updates.role = body.role;
    if (body.banned !== undefined) updates.banned = body.banned;
    await db.collection('users').updateOne({ id }, { $set: updates });
    if (body.banned) await db.collection('sessions').deleteMany({ userId: id });
    return res(await db.collection('users').findOne({ id }, { projection: { password: 0 } }));
  }
  return res({ error: 'Not found' }, 404);
}

// ============ SLIDERS ============
async function handleSliders(path, method, request, db) {
  const id = path[0];
  if (method === 'GET') {
    const url = new URL(request.url);
    const all = url.searchParams.get('all');
    if (all === 'true') return res(await db.collection('sliders').find({}).sort({ order: 1 }).toArray());
    return res(await db.collection('sliders').find({ active: true }).sort({ order: 1 }).toArray());
  }
  const user = await getUser(request, db);
  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
  if (method === 'POST') {
    const body = await request.json();
    const slider = { id: uuidv4(), image: body.image || '', title: body.title || '', link: body.link || '', order: body.order || 0, active: body.active !== false, createdAt: new Date() };
    await db.collection('sliders').insertOne(slider);
    return res(slider, 201);
  }
  if (method === 'PUT' && id) {
    const body = await request.json();
    const updates = {};
    ['image', 'title', 'link', 'order', 'active'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    await db.collection('sliders').updateOne({ id }, { $set: updates });
    return res(await db.collection('sliders').findOne({ id }));
  }
  if (method === 'DELETE' && id) { await db.collection('sliders').deleteOne({ id }); return res({ success: true }); }
  return res({ error: 'Not found' }, 404);
}

// ============ FAQS ============
async function handleFaqs(path, method, request, db) {
  const id = path[0];
  if (method === 'GET') return res(await db.collection('faqs').find({ active: true }).sort({ order: 1 }).toArray());
  const user = await getUser(request, db);
  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
  if (method === 'POST') {
    const body = await request.json();
    const faq = { id: uuidv4(), question: body.question || '', answer: body.answer || '', order: body.order || 0, active: body.active !== false, createdAt: new Date() };
    await db.collection('faqs').insertOne(faq);
    return res(faq, 201);
  }
  if (method === 'PUT' && id) {
    const body = await request.json();
    const updates = {};
    ['question', 'answer', 'order', 'active'].forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    await db.collection('faqs').updateOne({ id }, { $set: updates });
    return res(await db.collection('faqs').findOne({ id }));
  }
  if (method === 'DELETE' && id) { await db.collection('faqs').deleteOne({ id }); return res({ success: true }); }
  return res({ error: 'Not found' }, 404);
}

// ============ STATS ============
async function handleStats(path, method, request, db) {
  const user = await getUser(request, db);
  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
  const [totalProducts, totalOrders, totalUsers, pendingOrders, totalCodes, availableCodes, soldCodes] = await Promise.all([
    db.collection('products').countDocuments(),
    db.collection('orders').countDocuments(),
    db.collection('users').countDocuments(),
    db.collection('orders').countDocuments({ status: 'pending_delivery' }),
    db.collection('codes').countDocuments(),
    db.collection('codes').countDocuments({ status: 'available' }),
    db.collection('codes').countDocuments({ status: 'sold' }),
  ]);
  const revenueAgg = await db.collection('orders').aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]).toArray();
  const pendingReviews = await db.collection('reviews').countDocuments({ approved: false });
  const recentOrders = await db.collection('orders').find({}).sort({ createdAt: -1 }).limit(10).toArray();
  return res({ totalProducts, totalOrders, totalUsers, pendingOrders, totalCodes, availableCodes, soldCodes, totalRevenue: revenueAgg[0]?.total || 0, pendingReviews, recentOrders });
}

// ============ PAYPAL INTEGRATION ============
async function handlePayPal(pathParts, method, request, db) {
  const action = pathParts[0];

  // Create PayPal Order
  if (action === 'create-order' && method === 'POST') {
    const user = await getUser(request, db);
    if (!user) return res({ error: 'غير مصرح' }, 401);
    
    const body = await request.json();
    const { orderId, currency = 'USD' } = body;
    
    if (!orderId) return res({ error: 'معرف الطلب مطلوب' }, 400);
    
    // Get order from database
    const order = await db.collection('orders').findOne({ id: orderId, userId: user.id });
    if (!order) return res({ error: 'الطلب غير موجود' }, 404);
    if (order.status !== 'pending') return res({ error: 'الطلب تم معالجته بالفعل' }, 400);
    
    // Get exchange rates
    const rates = await getExchangeRates();
    const exchangeRate = rates[currency] || 1;
    const convertedAmount = (order.total * exchangeRate).toFixed(2);
    
    try {
      const paypalClientId = process.env.PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_SECRET;
      
      if (!paypalClientId || paypalClientId === 'your_paypal_client_id') {
        return res({ error: 'PayPal غير مكون. يرجى إضافة بيانات PayPal في .env' }, 500);
      }
      
      // Get PayPal access token
      const auth = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
      const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      
      if (!tokenResponse.ok) {
        console.error('PayPal token error:', await tokenResponse.text());
        return res({ error: 'فشل الاتصال بـ PayPal' }, 500);
      }
      
      const { access_token } = await tokenResponse.json();
      
      // Create PayPal order
      const createOrderResponse = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: orderId,
            amount: {
              currency_code: currency,
              value: convertedAmount,
            },
            description: `طلب FAST STORE #${orderId.slice(0, 8)}`,
          }],
          application_context: {
            brand_name: 'FAST STORE',
            locale: 'ar-SA',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=success&order=${orderId}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=cancelled&order=${orderId}`,
          },
        }),
      });
      
      if (!createOrderResponse.ok) {
        console.error('PayPal create order error:', await createOrderResponse.text());
        return res({ error: 'فشل إنشاء طلب الدفع' }, 500);
      }
      
      const paypalOrder = await createOrderResponse.json();
      
      // Store PayPal order ID in our database
      await db.collection('orders').updateOne(
        { id: orderId },
        { $set: { paypalOrderId: paypalOrder.id, paymentMethod: 'paypal', updatedAt: new Date() } }
      );
      
      return res({ paypalOrderId: paypalOrder.id, approveUrl: paypalOrder.links.find(l => l.rel === 'approve')?.href });
      
    } catch (e) {
      console.error('PayPal error:', e);
      return res({ error: 'خطأ في PayPal' }, 500);
    }
  }

  // Capture PayPal Payment
  if (action === 'capture-order' && method === 'POST') {
    const user = await getUser(request, db);
    if (!user) return res({ error: 'غير مصرح' }, 401);
    
    const body = await request.json();
    const { orderId, paypalOrderId } = body;
    
    if (!orderId || !paypalOrderId) return res({ error: 'معرفات الطلب مطلوبة' }, 400);
    
    try {
      const paypalClientId = process.env.PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_SECRET;
      
      // Get PayPal access token
      const auth = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
      const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      
      const { access_token } = await tokenResponse.json();
      
      // Capture the payment
      const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!captureResponse.ok) {
        console.error('PayPal capture error:', await captureResponse.text());
        return res({ error: 'فشل تأكيد الدفع' }, 500);
      }
      
      const captureData = await captureResponse.json();
      
      if (captureData.status === 'COMPLETED') {
        // Update order status to completed
        const order = await db.collection('orders').findOne({ id: orderId });
        await db.collection('orders').updateOne(
          { id: orderId },
          { 
            $set: { 
              status: 'completed', 
              paymentId: paypalOrderId,
              paymentCompletedAt: new Date(),
              updatedAt: new Date() 
            } 
          }
        );
        
        // Send confirmation email
        const settings = await db.collection('settings').findOne({});
        await sendMail(user.email, `تأكيد الطلب #${orderId.slice(0, 8)} - FAST STORE`, orderEmailHtml(order, settings));
        
        return res({ success: true, status: 'completed', orderId });
      } else {
        return res({ error: 'الدفع غير مكتمل', status: captureData.status }, 400);
      }
      
    } catch (e) {
      console.error('PayPal capture error:', e);
      return res({ error: 'خطأ في تأكيد الدفع' }, 500);
    }
  }

  return res({ error: 'Not found' }, 404);
}

// ============ GOOGLE OAUTH (EMERGENT AUTH) ============
async function handleGoogleAuth(pathParts, method, request, db) {
  const action = pathParts[0];

  // Exchange session_id for user data from Emergent Auth
  if (action === 'google-session' && method === 'POST') {
    const body = await request.json();
    const { session_id } = body;
    
    if (!session_id) return res({ error: 'session_id مطلوب' }, 400);
    
    try {
      // Call Emergent Auth to get user data
      const response = await fetch('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
        headers: {
          'X-Session-ID': session_id,
        },
      });
      
      if (!response.ok) {
        console.error('Emergent Auth error:', await response.text());
        return res({ error: 'فشل التحقق من Google' }, 401);
      }
      
      const userData = await response.json();
      const { id: googleId, email, name, picture, session_token } = userData;
      
      // Check if user exists by email
      let user = await db.collection('users').findOne({ email });
      
      if (user) {
        // Update existing user with Google data if needed
        if (!user.googleId) {
          await db.collection('users').updateOne(
            { id: user.id },
            { 
              $set: { 
                googleId, 
                picture,
                name: name || user.name,
                updatedAt: new Date() 
              } 
            }
          );
        }
      } else {
        // Create new user
        user = {
          id: uuidv4(),
          email,
          name: name || email.split('@')[0],
          googleId,
          picture,
          password: '', // No password for OAuth users
          role: 'user',
          banned: false,
          phone: '',
          countryCode: '',
          createdAt: new Date(),
        };
        await db.collection('users').insertOne(user);
      }
      
      // Create session with Emergent token
      const token = session_token || uuidv4();
      await db.collection('sessions').insertOne({ 
        token, 
        userId: user.id, 
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date() 
      });
      
      const { password: _, ...safeUser } = user;
      return res({ user: safeUser, token, session_token });
      
    } catch (e) {
      console.error('Google OAuth error:', e);
      return res({ error: 'خطأ في تسجيل الدخول عبر Google' }, 500);
    }
  }

  return res({ error: 'Not found' }, 404);
}

// ============ UPLOAD ============
async function handleUpload(pathParts, method, request, db) {
  if (method !== 'POST') return res({ error: 'Method not allowed' }, 405);
  const user = await getUser(request, db);
  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return res({ error: 'لم يتم تحديد ملف' }, 400);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedTypes.includes(file.type)) return res({ error: 'نوع الملف غير مسموح' }, 400);
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > 5 * 1024 * 1024) return res({ error: 'حجم الملف كبير (الحد 5MB)' }, 400);
    const buffer = Buffer.from(bytes);
    const ext = file.name.split('.').pop().toLowerCase();
    const safeName = `${uuidv4()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, safeName), buffer);
    return res({ url: `/uploads/${safeName}` }, 201);
  } catch (e) { console.error('Upload error:', e); return res({ error: 'فشل رفع الملف' }, 500); }
}

// ============ EXCHANGE RATES ============
async function handleExchangeRates(pathParts, method, request, db) {
  const rates = await getExchangeRates();
  return res({ rates: { USD: 1, SAR: rates?.SAR || 3.75, KWD: rates?.KWD || 0.31, AED: rates?.AED || 3.67, BHD: rates?.BHD || 0.376, QAR: rates?.QAR || 3.64, OMR: rates?.OMR || 0.385 }, cachedAt: ratesCacheTime });
}

// ============ MAIN ROUTER ============
async function handler(request, context) {
  const secHeaders = {
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block', 'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: { ...secHeaders, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(ip)) return NextResponse.json({ error: 'تم تجاوز الحد المسموح' }, { status: 429, headers: secHeaders });

  try {
    const routePath = context.params?.path || [];
    const resource = routePath[0];
    const db = await getDb();
    let response;
    switch (resource) {
      case 'auth': response = await handleAuth(routePath.slice(1), request.method, request, db); break;
      case 'categories': response = await handleCategories(routePath.slice(1), request.method, request, db); break;
      case 'products': response = await handleProducts(routePath.slice(1), request.method, request, db); break;
      case 'codes': response = await handleCodes(routePath.slice(1), request.method, request, db); break;
      case 'orders': response = await handleOrders(routePath.slice(1), request.method, request, db); break;
      case 'reviews': response = await handleReviews(routePath.slice(1), request.method, request, db); break;
      case 'discounts': response = await handleDiscounts(routePath.slice(1), request.method, request, db); break;
      case 'settings': response = await handleSettings(routePath.slice(1), request.method, request, db); break;
      case 'users': response = await handleUsers(routePath.slice(1), request.method, request, db); break;
      case 'sliders': response = await handleSliders(routePath.slice(1), request.method, request, db); break;
      case 'faqs': response = await handleFaqs(routePath.slice(1), request.method, request, db); break;
      case 'stats': response = await handleStats(routePath.slice(1), request.method, request, db); break;
      case 'upload': response = await handleUpload(routePath.slice(1), request.method, request, db); break;
      case 'exchange-rates': response = await handleExchangeRates(routePath.slice(1), request.method, request, db); break;
      default: response = NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    Object.entries(secHeaders).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'خطأ في السيرفر' }, { status: 500, headers: secHeaders });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
