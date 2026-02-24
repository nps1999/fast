import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ============ DATABASE ============
let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  cachedDb = client.db(process.env.DB_NAME || 'fast_store');
  cachedClient = client;
  // Create indexes
  try {
    await cachedDb.collection('users').createIndex({ email: 1 }, { unique: true });
    await cachedDb.collection('sessions').createIndex({ token: 1 });
    await cachedDb.collection('codes').createIndex({ productId: 1, status: 1 });
    await cachedDb.collection('products').createIndex({ categoryId: 1 });
    await cachedDb.collection('orders').createIndex({ userId: 1 });
  } catch (e) {}
  return cachedDb;
}

// ============ HELPERS ============
function hashPw(password) {
  return crypto.createHash('sha256').update(password + (process.env.AUTH_SECRET || 'salt')).digest('hex');
}

function res(data, status = 200) {
  return NextResponse.json(data, { status });
}

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
    const { email, password, name } = body;
    if (!email || !password || !name) return res({ error: 'جميع الحقول مطلوبة' }, 400);
    const user = {
      id: uuidv4(), email, name, password: hashPw(password),
      role: 'admin', banned: false, createdAt: new Date()
    };
    await db.collection('users').insertOne(user);
    const token = uuidv4();
    await db.collection('sessions').insertOne({ token, userId: user.id, createdAt: new Date() });
    const { password: _, ...safeUser } = user;
    return res({ user: safeUser, token });
  }

  if (action === 'register' && method === 'POST') {
    const body = await request.json();
    const { email, password, name } = body;
    if (!email || !password || !name) return res({ error: 'جميع الحقول مطلوبة' }, 400);
    const exists = await db.collection('users').findOne({ email });
    if (exists) return res({ error: 'البريد الإلكتروني مستخدم بالفعل' }, 400);
    const user = {
      id: uuidv4(), email, name, password: hashPw(password),
      role: 'user', banned: false, createdAt: new Date()
    };
    await db.collection('users').insertOne(user);
    const token = uuidv4();
    await db.collection('sessions').insertOne({ token, userId: user.id, createdAt: new Date() });
    const { password: _, ...safeUser } = user;
    return res({ user: safeUser, token });
  }

  if (action === 'login' && method === 'POST') {
    const body = await request.json();
    const { email, password } = body;
    const user = await db.collection('users').findOne({ email, password: hashPw(password) });
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
    if (auth?.startsWith('Bearer ')) {
      const token = auth.split(' ')[1];
      await db.collection('sessions').deleteOne({ token });
    }
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
    // Add product count
    for (const cat of cats) {
      cat.productCount = await db.collection('products').countDocuments({ categoryId: cat.id, active: true });
    }
    return res(cats);
  }

  if (method === 'GET' && id === 'all') {
    const cats = await db.collection('categories').find({}).sort({ order: 1 }).toArray();
    for (const cat of cats) {
      cat.productCount = await db.collection('products').countDocuments({ categoryId: cat.id });
    }
    return res(cats);
  }

  if (method === 'POST') {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    const cat = {
      id: uuidv4(), name: body.name, image: body.image || '',
      order: body.order || 0, active: body.active !== false, createdAt: new Date()
    };
    await db.collection('categories').insertOne(cat);
    return res(cat, 201);
  }

  if (method === 'PUT' && id) {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.image !== undefined) updates.image = body.image;
    if (body.order !== undefined) updates.order = body.order;
    if (body.active !== undefined) updates.active = body.active;
    await db.collection('categories').updateOne({ id }, { $set: updates });
    const updated = await db.collection('categories').findOne({ id });
    return res(updated);
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
    const categoryId = url.searchParams.get('categoryId');
    const search = url.searchParams.get('search');
    const featured = url.searchParams.get('featured');
    const all = url.searchParams.get('all');

    const filter = {};
    if (!all) filter.active = true;
    if (categoryId) filter.categoryId = categoryId;
    if (featured === 'true') filter.featured = true;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const products = await db.collection('products').find(filter).sort({ createdAt: -1 }).toArray();
    // Get stock counts
    const codeCounts = await db.collection('codes').aggregate([
      { $match: { status: 'available' } },
      { $group: { _id: '$productId', count: { $sum: 1 } } }
    ]).toArray();
    const countMap = {};
    codeCounts.forEach(c => { countMap[c._id] = c.count; });
    products.forEach(p => { p.stock = countMap[p.id] || 0; });

    // Get review stats
    const reviewStats = await db.collection('reviews').aggregate([
      { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]).toArray();
    const reviewMap = {};
    reviewStats.forEach(r => { reviewMap[r._id] = { avgRating: Math.round(r.avg * 10) / 10, reviewCount: r.count }; });
    products.forEach(p => {
      p.avgRating = reviewMap[p.id]?.avgRating || 0;
      p.reviewCount = reviewMap[p.id]?.reviewCount || 0;
    });

    return res(products);
  }

  if (method === 'GET' && id) {
    const product = await db.collection('products').findOne({ id });
    if (!product) return res({ error: 'المنتج غير موجود' }, 404);
    product.stock = await db.collection('codes').countDocuments({ productId: id, status: 'available' });
    const reviews = await db.collection('reviews').find({ productId: id }).sort({ createdAt: -1 }).toArray();
    product.reviews = reviews;
    const stats = await db.collection('reviews').aggregate([
      { $match: { productId: id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]).toArray();
    product.avgRating = stats[0]?.avg ? Math.round(stats[0].avg * 10) / 10 : 0;
    product.reviewCount = stats[0]?.count || 0;
    // Get category name
    if (product.categoryId) {
      const cat = await db.collection('categories').findOne({ id: product.categoryId });
      product.categoryName = cat?.name || '';
    }
    return res(product);
  }

  if (method === 'POST') {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    const product = {
      id: uuidv4(), name: body.name, description: body.description || '',
      price: parseFloat(body.price) || 0, originalPrice: parseFloat(body.originalPrice) || 0,
      discount: parseFloat(body.discount) || 0, categoryId: body.categoryId || '',
      image: body.image || '', active: body.active !== false,
      featured: body.featured || false, createdAt: new Date()
    };
    await db.collection('products').insertOne(product);
    return res(product, 201);
  }

  if (method === 'PUT' && id) {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const body = await request.json();
    const updates = {};
    const fields = ['name', 'description', 'price', 'originalPrice', 'discount', 'categoryId', 'image', 'active', 'featured'];
    fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    if (updates.price !== undefined) updates.price = parseFloat(updates.price);
    if (updates.originalPrice !== undefined) updates.originalPrice = parseFloat(updates.originalPrice);
    if (updates.discount !== undefined) updates.discount = parseFloat(updates.discount);
    await db.collection('products').updateOne({ id }, { $set: updates });
    const updated = await db.collection('products').findOne({ id });
    return res(updated);
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
    const codes = await db.collection('codes').find({ productId }).sort({ createdAt: -1 }).toArray();
    return res(codes);
  }

  if (method === 'POST') {
    const body = await request.json();
    const { productId, codes: codesList } = body;
    if (!productId || !codesList || !Array.isArray(codesList)) return res({ error: 'بيانات غير صحيحة' }, 400);
    const docs = codesList.filter(c => c.trim()).map(code => ({
      id: uuidv4(), productId, code: code.trim(),
      status: 'available', orderId: null, createdAt: new Date()
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
    const orders = await db.collection('orders').find(filter).sort({ createdAt: -1 }).toArray();
    return res(orders);
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
    const { items, discountCode } = body;
    if (!items || !items.length) return res({ error: 'السلة فارغة' }, 400);

    const orderId = uuidv4();
    let subtotal = 0;
    const orderItems = [];
    let hasPending = false;

    for (const item of items) {
      const product = await db.collection('products').findOne({ id: item.productId, active: true });
      if (!product) continue;

      let price = product.price;
      if (product.discount > 0) price = product.price * (1 - product.discount / 100);
      price = Math.round(price * 100) / 100;

      // Reserve codes atomically
      const deliveredCodes = [];
      for (let i = 0; i < (item.quantity || 1); i++) {
        const code = await db.collection('codes').findOneAndUpdate(
          { productId: item.productId, status: 'available' },
          { $set: { status: 'sold', orderId, soldAt: new Date() } }
        );
        if (code) deliveredCodes.push(code.code);
      }

      const qty = item.quantity || 1;
      const pendingCount = qty - deliveredCodes.length;
      if (pendingCount > 0) hasPending = true;

      orderItems.push({
        productId: product.id, productName: product.name,
        productImage: product.image, price, quantity: qty,
        deliveredCodes, pendingCount
      });
      subtotal += price * qty;
    }

    // Apply discount
    let discountAmount = 0;
    let appliedDiscount = null;
    if (discountCode) {
      const disc = await db.collection('discount_codes').findOne({
        code: discountCode, active: true
      });
      if (disc && (!disc.maxUses || disc.currentUses < disc.maxUses)) {
        const notExpired = !disc.expiresAt || new Date(disc.expiresAt) > new Date();
        if (notExpired && subtotal >= (disc.minOrder || 0)) {
          discountAmount = disc.type === 'percentage'
            ? subtotal * (disc.value / 100)
            : Math.min(disc.value, subtotal);
          discountAmount = Math.round(discountAmount * 100) / 100;
          appliedDiscount = disc.code;
          await db.collection('discount_codes').updateOne({ id: disc.id }, { $inc: { currentUses: 1 } });
        }
      }
    }

    const total = Math.round((subtotal - discountAmount) * 100) / 100;
    const order = {
      id: orderId, userId: user.id, userEmail: user.email, userName: user.name,
      items: orderItems, subtotal, discountCode: appliedDiscount, discountAmount, total,
      status: hasPending ? 'pending_delivery' : 'completed',
      paymentMethod: 'direct', createdAt: new Date()
    };
    await db.collection('orders').insertOne(order);
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
      return res({ ...order, status });
    }

    if (body.status) {
      await db.collection('orders').updateOne({ id }, { $set: { status: body.status } });
    }
    const updated = await db.collection('orders').findOne({ id });
    return res(updated);
  }

  return res({ error: 'Not found' }, 404);
}

// ============ REVIEWS ============
async function handleReviews(path, method, request, db) {
  const user = await getUser(request, db);

  if (method === 'GET') {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const filter = productId ? { productId } : {};
    const reviews = await db.collection('reviews').find(filter).sort({ createdAt: -1 }).toArray();
    return res(reviews);
  }

  if (method === 'POST') {
    if (!user) return res({ error: 'يجب تسجيل الدخول' }, 401);
    const body = await request.json();
    const { productId, rating, comment } = body;
    if (!productId || !rating) return res({ error: 'بيانات ناقصة' }, 400);
    // Check if user already reviewed this product
    const existing = await db.collection('reviews').findOne({ productId, userId: user.id });
    if (existing) return res({ error: 'لقد قمت بتقييم هذا المنتج مسبقاً' }, 400);
    const review = {
      id: uuidv4(), productId, userId: user.id, userName: user.name,
      rating: Math.min(5, Math.max(1, parseInt(rating))),
      comment: comment || '', createdAt: new Date()
    };
    await db.collection('reviews').insertOne(review);
    return res(review, 201);
  }

  if (method === 'DELETE') {
    if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);
    const id = path[0];
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

  if (method === 'GET') {
    const discounts = await db.collection('discount_codes').find({}).sort({ createdAt: -1 }).toArray();
    return res(discounts);
  }

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
    ['code', 'type', 'value', 'minOrder', 'maxUses', 'active', 'expiresAt'].forEach(f => {
      if (body[f] !== undefined) updates[f] = body[f];
    });
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
        id: 'main', siteName: 'FAST STORE',
        primaryColor: '#8b5cf6', secondaryColor: '#22d3ee',
        contactEmail: '', contactPhone: '', contactWhatsapp: '',
        socialLinks: { twitter: '', instagram: '', discord: '', telegram: '' }
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
    ['siteName', 'primaryColor', 'secondaryColor', 'contactEmail', 'contactPhone', 'contactWhatsapp', 'socialLinks'].forEach(f => {
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

  if (method === 'GET') {
    const users = await db.collection('users').find({}).project({ password: 0 }).sort({ createdAt: -1 }).toArray();
    return res(users);
  }

  if (method === 'PUT' && id) {
    const body = await request.json();
    const updates = {};
    if (body.role !== undefined) updates.role = body.role;
    if (body.banned !== undefined) updates.banned = body.banned;
    await db.collection('users').updateOne({ id }, { $set: updates });
    if (body.banned) {
      await db.collection('sessions').deleteMany({ userId: id });
    }
    return res(await db.collection('users').findOne({ id }, { projection: { password: 0 } }));
  }

  return res({ error: 'Not found' }, 404);
}

// ============ SLIDERS ============
async function handleSliders(path, method, request, db) {
  const id = path[0];

  if (method === 'GET') {
    const sliders = await db.collection('sliders').find({ active: true }).sort({ order: 1 }).toArray();
    return res(sliders);
  }

  const user = await getUser(request, db);
  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);

  if (method === 'POST') {
    const body = await request.json();
    const slider = {
      id: uuidv4(), image: body.image || '', title: body.title || '',
      link: body.link || '', order: body.order || 0, active: body.active !== false, createdAt: new Date()
    };
    await db.collection('sliders').insertOne(slider);
    return res(slider, 201);
  }

  if (method === 'PUT' && id) {
    const body = await request.json();
    const updates = {};
    ['image', 'title', 'link', 'order', 'active'].forEach(f => {
      if (body[f] !== undefined) updates[f] = body[f];
    });
    await db.collection('sliders').updateOne({ id }, { $set: updates });
    return res(await db.collection('sliders').findOne({ id }));
  }

  if (method === 'DELETE' && id) {
    await db.collection('sliders').deleteOne({ id });
    return res({ success: true });
  }

  return res({ error: 'Not found' }, 404);
}

// ============ FAQS ============
async function handleFaqs(path, method, request, db) {
  const id = path[0];

  if (method === 'GET') {
    const faqs = await db.collection('faqs').find({ active: true }).sort({ order: 1 }).toArray();
    return res(faqs);
  }

  const user = await getUser(request, db);
  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);

  if (method === 'POST') {
    const body = await request.json();
    const faq = {
      id: uuidv4(), question: body.question || '', answer: body.answer || '',
      order: body.order || 0, active: body.active !== false, createdAt: new Date()
    };
    await db.collection('faqs').insertOne(faq);
    return res(faq, 201);
  }

  if (method === 'PUT' && id) {
    const body = await request.json();
    const updates = {};
    ['question', 'answer', 'order', 'active'].forEach(f => {
      if (body[f] !== undefined) updates[f] = body[f];
    });
    await db.collection('faqs').updateOne({ id }, { $set: updates });
    return res(await db.collection('faqs').findOne({ id }));
  }

  if (method === 'DELETE' && id) {
    await db.collection('faqs').deleteOne({ id });
    return res({ success: true });
  }

  return res({ error: 'Not found' }, 404);
}

// ============ STATS ============
async function handleStats(path, method, request, db) {
  const user = await getUser(request, db);
  if (!user || user.role !== 'admin') return res({ error: 'غير مصرح' }, 403);

  const totalProducts = await db.collection('products').countDocuments();
  const totalOrders = await db.collection('orders').countDocuments();
  const totalUsers = await db.collection('users').countDocuments();
  const pendingOrders = await db.collection('orders').countDocuments({ status: 'pending_delivery' });
  const totalCodes = await db.collection('codes').countDocuments();
  const availableCodes = await db.collection('codes').countDocuments({ status: 'available' });
  const soldCodes = await db.collection('codes').countDocuments({ status: 'sold' });

  const revenueAgg = await db.collection('orders').aggregate([
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]).toArray();
  const totalRevenue = revenueAgg[0]?.total || 0;

  // Recent orders
  const recentOrders = await db.collection('orders').find({}).sort({ createdAt: -1 }).limit(10).toArray();

  return res({
    totalProducts, totalOrders, totalUsers, pendingOrders,
    totalCodes, availableCodes, soldCodes, totalRevenue, recentOrders
  });
}

// ============ MAIN ROUTER ============
async function handler(request, context) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const path = context.params?.path || [];
    const method = request.method;
    const resource = path[0];
    const db = await getDb();

    switch (resource) {
      case 'auth': return await handleAuth(path.slice(1), method, request, db);
      case 'categories': return await handleCategories(path.slice(1), method, request, db);
      case 'products': return await handleProducts(path.slice(1), method, request, db);
      case 'codes': return await handleCodes(path.slice(1), method, request, db);
      case 'orders': return await handleOrders(path.slice(1), method, request, db);
      case 'reviews': return await handleReviews(path.slice(1), method, request, db);
      case 'discounts': return await handleDiscounts(path.slice(1), method, request, db);
      case 'settings': return await handleSettings(path.slice(1), method, request, db);
      case 'users': return await handleUsers(path.slice(1), method, request, db);
      case 'sliders': return await handleSliders(path.slice(1), method, request, db);
      case 'faqs': return await handleFaqs(path.slice(1), method, request, db);
      case 'stats': return await handleStats(path.slice(1), method, request, db);
      default: return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'خطأ في السيرفر' }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
