'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Toaster, toast } from 'sonner';
import useEmblaCarousel from 'embla-carousel-react';
import {
  ShoppingCart, User, LogOut, Search, Star, Plus, Minus, Trash2, ChevronLeft,
  ChevronRight, Package, FolderOpen, Key, Users, Tag, Image, HelpCircle,
  Settings, BarChart3, Eye, EyeOff, Shield, Ban, Check, X, Edit, Copy,
  Gamepad2, Zap, Crown, ArrowRight, Heart, Clock, Mail, Phone, Send,
  Menu, Home, ChevronDown, Loader2, AlertCircle, CheckCircle, Truck
} from 'lucide-react';

// ============ API HELPER ============
async function api(url, options = {}, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const r = await fetch(`/api${url}`, { ...options, headers });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'خطأ في الطلب');
    return data;
  } catch (e) {
    throw e;
  }
}

// ============ STAR RATING ============
function StarRating({ rating, onRate, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5 flex-row-reverse" dir="ltr">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sz} cursor-pointer transition-colors ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
          onClick={() => onRate?.(i)}
        />
      ))}
    </div>
  );
}

// ============ SLIDER ============
function HeroSlider({ sliders }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: 'rtl' });

  useEffect(() => {
    if (!emblaApi || sliders.length <= 1) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [emblaApi, sliders.length]);

  if (!sliders.length) return null;

  return (
    <div className="relative mb-8 group">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {sliders.map(s => (
            <div key={s.id} className="flex-[0_0_100%] min-w-0">
              <div className="relative h-[200px] sm:h-[300px] md:h-[400px] overflow-hidden rounded-xl">
                <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {s.title && (
                  <div className="absolute bottom-6 right-6 text-white">
                    <h2 className="text-2xl md:text-4xl font-bold neon-text">{s.title}</h2>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {sliders.length > 1 && (
        <>
          <button onClick={() => emblaApi?.scrollPrev()}
            className="absolute top-1/2 right-3 -translate-y-1/2 bg-black/50 hover:bg-purple-600/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={() => emblaApi?.scrollNext()}
            className="absolute top-1/2 left-3 -translate-y-1/2 bg-black/50 hover:bg-purple-600/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}

// ============ PRODUCT CARD ============
function ProductCard({ product, onView, onAddToCart }) {
  const finalPrice = product.discount > 0
    ? (product.price * (1 - product.discount / 100)).toFixed(2)
    : product.price?.toFixed(2);

  return (
    <Card className="group bg-[#12121f] border-purple-500/10 hover:border-purple-500/40 transition-all duration-500 overflow-hidden hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] cursor-pointer animate-fade-in"
      onClick={() => onView(product.id)}>
      <div className="relative overflow-hidden h-48">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-cyan-900/40 flex items-center justify-center">
            <Gamepad2 className="w-12 h-12 text-purple-400/50" />
          </div>
        )}
        {product.discount > 0 && (
          <Badge className="absolute top-3 left-3 bg-red-500/90 text-white border-0 animate-pulse">
            خصم {product.discount}%
          </Badge>
        )}
        {product.stock === 0 && (
          <Badge className="absolute top-3 right-3 bg-orange-500/90 text-white border-0">
            نفذت الكمية
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-2 text-white group-hover:text-purple-400 transition-colors line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-2 mb-2">
          <StarRating rating={Math.round(product.avgRating || 0)} />
          <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-purple-400">${finalPrice}</span>
            {product.discount > 0 && (
              <span className="text-sm text-gray-500 line-through">${product.price?.toFixed(2)}</span>
            )}
          </div>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white"
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Package className="w-3 h-3" />
          <span>{product.stock > 0 ? `${product.stock} متوفر` : 'غير متوفر حالياً'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MAIN APP ============
export default function App() {
  // State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [cart, setCart] = useState([]);
  const [page, setPage] = useState('home');
  const [pageId, setPageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [settings, setSettings] = useState({ siteName: 'FAST STORE' });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [sliders, setSliders] = useState([]);
  const [faqs, setFaqs] = useState([]);

  // Navigation
  const navigate = useCallback((p, id = null) => {
    setPage(p);
    setPageId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileMenu(false);
  }, []);

  // Cart helpers
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const finalPrice = product.discount > 0
        ? Math.round(product.price * (1 - product.discount / 100) * 100) / 100
        : product.price;
      return [...prev, { productId: product.id, name: product.name, image: product.image, price: finalPrice, originalPrice: product.price, quantity: 1 }];
    });
    toast.success('تمت الإضافة إلى السلة');
  }, []);

  const updateCartQty = useCallback((productId, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.productId !== productId));
    } else {
      setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
    }
  }, []);

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Persist cart
  useEffect(() => {
    if (cart.length > 0) localStorage.setItem('cart', JSON.stringify(cart));
    else localStorage.removeItem('cart');
  }, [cart]);

  // Init
  useEffect(() => {
    async function init() {
      try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) setCart(JSON.parse(savedCart));

        const savedToken = localStorage.getItem('token');
        if (savedToken) {
          setToken(savedToken);
          const { user: u } = await api('/auth/session', {}, savedToken);
          if (u) setUser(u);
          else { localStorage.removeItem('token'); setToken(''); }
        }

        const [adminCheck, settingsData, cats, prods, slids, faqsData] = await Promise.all([
          api('/auth/check-admin'),
          api('/settings').catch(() => ({ siteName: 'FAST STORE' })),
          api('/categories').catch(() => []),
          api('/products').catch(() => []),
          api('/sliders').catch(() => []),
          api('/faqs').catch(() => []),
        ]);

        setHasAdmin(adminCheck.hasAdmin);
        if (settingsData.siteName) setSettings(settingsData);
        setCategories(cats);
        setProducts(prods);
        setSliders(slids);
        setFaqs(faqsData);
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Apply dynamic colors
  useEffect(() => {
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--dynamic-primary', settings.primaryColor);
    }
  }, [settings]);

  // Auth
  const handleLogin = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    toast.success('تم تسجيل الدخول بنجاح');
    navigate('home');
  };

  const handleRegister = async (name, email, password) => {
    const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    toast.success('تم إنشاء الحساب بنجاح');
    navigate('home');
  };

  const handleLogout = async () => {
    await api('/auth/logout', { method: 'POST' }, token).catch(() => {});
    setUser(null);
    setToken('');
    localStorage.removeItem('token');
    toast.success('تم تسجيل الخروج');
    navigate('home');
  };

  const handleSetupAdmin = async (name, email, password) => {
    const data = await api('/auth/setup-admin', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    setHasAdmin(true);
    toast.success('تم إنشاء حساب المدير بنجاح');
  };

  const refreshData = useCallback(async () => {
    const [cats, prods, slids, faqsData] = await Promise.all([
      api('/categories').catch(() => []),
      api('/products').catch(() => []),
      api('/sliders').catch(() => []),
      api('/faqs').catch(() => []),
    ]);
    setCategories(cats);
    setProducts(prods);
    setSliders(slids);
    setFaqs(faqsData);
  }, []);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center animate-pulse">
          <Gamepad2 className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-float" />
          <p className="text-purple-400 text-xl font-bold neon-text">جاري التحميل...</p>
        </div>
        <Toaster theme="dark" position="top-center" richColors />
      </div>
    );
  }

  // Admin Setup
  if (!hasAdmin) {
    return <SetupAdminPage onSetup={handleSetupAdmin} />;
  }

  // ============ HEADER ============
  const Header = () => (
    <header className="sticky top-0 z-50 glass-card border-b border-purple-500/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('home')}>
            <Zap className="w-8 h-8 text-purple-400" />
            <span className="text-xl font-black text-white neon-text">{settings.siteName || 'FAST STORE'}</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate('home')} className={`text-sm font-medium transition-colors hover:text-purple-400 ${page === 'home' ? 'text-purple-400' : 'text-gray-300'}`}>
              الرئيسية
            </button>
            {categories.slice(0, 5).map(cat => (
              <button key={cat.id} onClick={() => navigate('category', cat.id)}
                className={`text-sm font-medium transition-colors hover:text-purple-400 ${page === 'category' && pageId === cat.id ? 'text-purple-400' : 'text-gray-300'}`}>
                {cat.name}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden sm:flex items-center bg-[#1a1a2e] rounded-lg border border-purple-500/20 px-3 py-1.5">
              <Search className="w-4 h-4 text-gray-400 ml-2" />
              <input
                type="text"
                placeholder="بحث..."
                className="bg-transparent text-sm text-white outline-none w-32"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim()) navigate('search'); }}
              />
            </div>

            {/* Cart */}
            <button onClick={() => navigate('cart')} className="relative p-2 hover:bg-purple-500/20 rounded-lg transition-colors">
              <ShoppingCart className="w-5 h-5 text-gray-300" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User */}
            {user ? (
              <div className="flex items-center gap-2">
                {user.role === 'admin' && (
                  <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hidden sm:flex"
                    onClick={() => navigate('admin')}>
                    <Crown className="w-4 h-4 ml-1" /> لوحة التحكم
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-gray-300 hover:text-purple-400"
                  onClick={() => navigate('orders')}>
                  <Package className="w-4 h-4 ml-1" /> <span className="hidden sm:inline">طلباتي</span>
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" className="bg-purple-600 hover:bg-purple-500" onClick={() => navigate('login')}>
                <User className="w-4 h-4 ml-1" /> دخول
              </Button>
            )}

            {/* Mobile menu */}
            <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
              <Menu className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenu && (
          <nav className="md:hidden mt-3 py-3 border-t border-purple-500/20 flex flex-col gap-2 animate-slide-up">
            <button onClick={() => navigate('home')} className="text-right text-gray-300 hover:text-purple-400 py-1">الرئيسية</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => navigate('category', cat.id)} className="text-right text-gray-300 hover:text-purple-400 py-1">{cat.name}</button>
            ))}
            {user?.role === 'admin' && (
              <button onClick={() => navigate('admin')} className="text-right text-purple-400 py-1 font-medium">لوحة التحكم</button>
            )}
          </nav>
        )}
      </div>
    </header>
  );

  // ============ HOME PAGE ============
  const HomePage = () => {
    const featuredProducts = products.filter(p => p.featured);
    const filteredProducts = searchQuery && page === 'search'
      ? products.filter(p => p.name.includes(searchQuery))
      : products;

    return (
      <div className="animate-fade-in">
        <HeroSlider sliders={sliders} />

        {/* Categories */}
        {categories.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-purple-400" />
              <span className="neon-text">الأقسام</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.map(cat => (
                <Card key={cat.id}
                  className="group bg-[#12121f] border-purple-500/10 hover:border-purple-500/40 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                  onClick={() => navigate('category', cat.id)}>
                  <div className="h-28 overflow-hidden">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-cyan-900/30 flex items-center justify-center">
                        <Gamepad2 className="w-10 h-10 text-purple-500/40" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 text-center">
                    <h3 className="font-bold text-sm group-hover:text-purple-400 transition-colors">{cat.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{cat.productCount || 0} منتج</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-400" />
              <span>المنتجات المميزة</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts.map(p => (
                <ProductCard key={p.id} product={p} onView={(id) => navigate('product', id)} onAddToCart={addToCart} />
              ))}
            </div>
          </section>
        )}

        {/* All Products */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-400" />
            <span>جميع المنتجات</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(page === 'search' ? filteredProducts : products).map(p => (
              <ProductCard key={p.id} product={p} onView={(id) => navigate('product', id)} onAddToCart={addToCart} />
            ))}
          </div>
          {products.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">لا توجد منتجات بعد</p>
            </div>
          )}
        </section>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-purple-400" />
              <span>الأسئلة الشائعة</span>
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map(faq => (
                <AccordionItem key={faq.id} value={faq.id} className="bg-[#12121f] border border-purple-500/10 rounded-lg px-4">
                  <AccordionTrigger className="text-right hover:text-purple-400">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-gray-400">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        {/* Contact */}
        {(settings.contactEmail || settings.contactPhone || settings.contactWhatsapp) && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Mail className="w-6 h-6 text-cyan-400" />
              <span>تواصل معنا</span>
            </h2>
            <Card className="bg-[#12121f] border-purple-500/10 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {settings.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">{settings.contactEmail}</span>
                  </div>
                )}
                {settings.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">{settings.contactPhone}</span>
                  </div>
                )}
                {settings.contactWhatsapp && (
                  <a href={`https://wa.me/${settings.contactWhatsapp}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 text-green-400 hover:text-green-300">
                    <Send className="w-5 h-5" />
                    <span>واتساب</span>
                  </a>
                )}
              </div>
            </Card>
          </section>
        )}
      </div>
    );
  };

  // ============ CATEGORY PAGE ============
  const CategoryPage = () => {
    const category = categories.find(c => c.id === pageId);
    const catProducts = products.filter(p => p.categoryId === pageId);

    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => navigate('home')} className="text-gray-400 hover:text-purple-400">الرئيسية</button>
          <ChevronLeft className="w-4 h-4 text-gray-600" />
          <span className="text-purple-400">{category?.name}</span>
        </div>
        <h1 className="text-3xl font-bold mb-8 neon-text">{category?.name}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {catProducts.map(p => (
            <ProductCard key={p.id} product={p} onView={(id) => navigate('product', id)} onAddToCart={addToCart} />
          ))}
        </div>
        {catProducts.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>لا توجد منتجات في هذا القسم</p>
          </div>
        )}
      </div>
    );
  };

  // ============ PRODUCT DETAIL ============
  const ProductDetail = () => {
    const [product, setProduct] = useState(null);
    const [pLoading, setPLoading] = useState(true);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');

    useEffect(() => {
      if (!pageId) return;
      setPLoading(true);
      api(`/products/${pageId}`).then(setProduct).catch(() => {}).finally(() => setPLoading(false));
    }, [pageId]);

    const submitReview = async () => {
      if (!user) { toast.error('يجب تسجيل الدخول أولاً'); navigate('login'); return; }
      try {
        await api('/reviews', { method: 'POST', body: JSON.stringify({ productId: pageId, rating: reviewRating, comment: reviewComment }) }, token);
        toast.success('تم إضافة التقييم بنجاح');
        setReviewComment('');
        const updated = await api(`/products/${pageId}`);
        setProduct(updated);
      } catch (e) { toast.error(e.message); }
    };

    if (pLoading) return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;
    if (!product) return <div className="text-center py-16 text-gray-500">المنتج غير موجود</div>;

    const finalPrice = product.discount > 0
      ? (product.price * (1 - product.discount / 100)).toFixed(2)
      : product.price?.toFixed(2);

    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button onClick={() => navigate('home')} className="text-gray-400 hover:text-purple-400">الرئيسية</button>
          <ChevronLeft className="w-4 h-4 text-gray-600" />
          {product.categoryName && (
            <>
              <button onClick={() => navigate('category', product.categoryId)} className="text-gray-400 hover:text-purple-400">{product.categoryName}</button>
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </>
          )}
          <span className="text-purple-400">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Image */}
          <div className="relative rounded-xl overflow-hidden h-[300px] md:h-[400px]">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-cyan-900/30 flex items-center justify-center">
                <Gamepad2 className="w-24 h-24 text-purple-500/30" />
              </div>
            )}
            {product.discount > 0 && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-white text-lg px-4 py-1 border-0">خصم {product.discount}%</Badge>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            <div className="flex items-center gap-3 mb-4">
              <StarRating rating={Math.round(product.avgRating || 0)} size="md" />
              <span className="text-gray-400">({product.reviewCount || 0} تقييم)</span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl font-black text-purple-400">${finalPrice}</span>
              {product.discount > 0 && (
                <span className="text-xl text-gray-500 line-through">${product.price?.toFixed(2)}</span>
              )}
            </div>
            {product.description && (
              <p className="text-gray-400 mb-6 leading-relaxed">{product.description}</p>
            )}
            <div className="flex items-center gap-3 mb-6">
              <Badge variant={product.stock > 0 ? 'default' : 'destructive'}
                className={product.stock > 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}>
                {product.stock > 0 ? `${product.stock} متوفر في المخزون` : 'غير متوفر حالياً - سيتم التسليم يدوياً'}
              </Badge>
            </div>
            <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-500 text-white text-lg py-6 neon-glow"
              onClick={() => addToCart(product)}>
              <ShoppingCart className="w-5 h-5 ml-2" /> أضف إلى السلة
            </Button>
          </div>
        </div>

        {/* Reviews */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400" />
            <span>التقييمات ({product.reviews?.length || 0})</span>
          </h2>

          {/* Add Review */}
          {user && (
            <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
              <h3 className="font-bold mb-3">أضف تقييمك</h3>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-gray-400">التقييم:</span>
                <StarRating rating={reviewRating} onRate={setReviewRating} size="md" />
              </div>
              <Textarea
                placeholder="اكتب تعليقك هنا..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="bg-[#0a0a15] border-purple-500/20 mb-3"
              />
              <Button className="bg-purple-600 hover:bg-purple-500" onClick={submitReview}>إرسال التقييم</Button>
            </Card>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {product.reviews?.map(review => (
              <Card key={review.id} className="bg-[#12121f] border-purple-500/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
                      {review.userName?.charAt(0)}
                    </div>
                    <span className="font-medium">{review.userName}</span>
                  </div>
                  <StarRating rating={review.rating} />
                </div>
                {review.comment && <p className="text-gray-400 text-sm">{review.comment}</p>}
                <span className="text-xs text-gray-600 mt-2 block">{new Date(review.createdAt).toLocaleDateString('ar')}</span>
              </Card>
            ))}
          </div>
        </section>
      </div>
    );
  };

  // ============ CART PAGE ============
  const CartPage = () => (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <ShoppingCart className="w-8 h-8 text-purple-400" />
        <span>سلة المشتريات</span>
      </h1>
      {cart.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-20 h-20 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">السلة فارغة</p>
          <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => navigate('home')}>تصفح المنتجات</Button>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {cart.map(item => (
              <Card key={item.productId} className="bg-[#12121f] border-purple-500/10 p-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-purple-900/30 flex items-center justify-center">
                        <Gamepad2 className="w-8 h-8 text-purple-500/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">{item.name}</h3>
                    <p className="text-purple-400 font-bold">${item.price?.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="w-8 h-8 border-purple-500/30"
                      onClick={() => updateCartQty(item.productId, item.quantity - 1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <Button size="icon" variant="outline" className="w-8 h-8 border-purple-500/30"
                      onClick={() => updateCartQty(item.productId, item.quantity + 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <span className="font-bold text-lg min-w-[80px] text-left">${(item.price * item.quantity).toFixed(2)}</span>
                  <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300"
                    onClick={() => updateCartQty(item.productId, 0)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="bg-[#12121f] border-purple-500/20 p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg text-gray-400">المجموع:</span>
              <span className="text-3xl font-black text-purple-400">${cartTotal.toFixed(2)}</span>
            </div>
            <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-500 text-lg py-6 neon-glow"
              onClick={() => { if (!user) { toast.error('يجب تسجيل الدخول أولاً'); navigate('login'); } else navigate('checkout'); }}>
              إتمام الشراء
            </Button>
          </Card>
        </>
      )}
    </div>
  );

  // ============ CHECKOUT ============
  const CheckoutPage = () => {
    const [discountCode, setDiscountCode] = useState('');
    const [discountInfo, setDiscountInfo] = useState(null);
    const [processing, setProcessing] = useState(false);

    const validateDiscount = async () => {
      try {
        const data = await api('/discounts/validate', { method: 'POST', body: JSON.stringify({ code: discountCode }) });
        setDiscountInfo(data);
        toast.success('تم تطبيق كود الخصم');
      } catch (e) { toast.error(e.message); setDiscountInfo(null); }
    };

    let discountAmount = 0;
    if (discountInfo) {
      discountAmount = discountInfo.type === 'percentage'
        ? cartTotal * (discountInfo.value / 100)
        : Math.min(discountInfo.value, cartTotal);
    }
    const finalTotal = cartTotal - discountAmount;

    const placeOrder = async () => {
      setProcessing(true);
      try {
        const items = cart.map(i => ({ productId: i.productId, quantity: i.quantity }));
        const order = await api('/orders', {
          method: 'POST',
          body: JSON.stringify({ items, discountCode: discountInfo ? discountCode : undefined })
        }, token);
        setCart([]);
        localStorage.removeItem('cart');
        toast.success('تم إنشاء الطلب بنجاح!');
        navigate('order', order.id);
      } catch (e) { toast.error(e.message); }
      finally { setProcessing(false); }
    };

    return (
      <div className="animate-fade-in max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <CheckCircle className="w-8 h-8 text-purple-400" />
          <span>إتمام الشراء</span>
        </h1>

        {/* Order Summary */}
        <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">ملخص الطلب</h2>
          {cart.map(item => (
            <div key={item.productId} className="flex justify-between py-2 border-b border-gray-800">
              <span>{item.name} × {item.quantity}</span>
              <span className="text-purple-400">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 mt-2">
            <span>المجموع الفرعي</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between py-2 text-green-400">
              <span>الخصم</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <Separator className="my-2 bg-purple-500/20" />
          <div className="flex justify-between py-2 text-xl font-bold">
            <span>الإجمالي</span>
            <span className="text-purple-400">${finalTotal.toFixed(2)}</span>
          </div>
        </Card>

        {/* Discount Code */}
        <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
          <h2 className="font-bold mb-3">كود خصم</h2>
          <div className="flex gap-2">
            <Input placeholder="أدخل كود الخصم" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)}
              className="bg-[#0a0a15] border-purple-500/20" />
            <Button className="bg-purple-600 hover:bg-purple-500" onClick={validateDiscount}>تطبيق</Button>
          </div>
          {discountInfo && (
            <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">
              خصم {discountInfo.type === 'percentage' ? `${discountInfo.value}%` : `$${discountInfo.value}`} مطبق
            </Badge>
          )}
        </Card>

        <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-500 text-lg py-6 neon-glow"
          onClick={placeOrder} disabled={processing}>
          {processing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Zap className="w-5 h-5 ml-2" />}
          {processing ? 'جاري المعالجة...' : 'تأكيد الطلب'}
        </Button>
      </div>
    );
  };

  // ============ ORDERS PAGE ============
  const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [oLoading, setOLoading] = useState(true);

    useEffect(() => {
      api('/orders', {}, token).then(setOrders).catch(() => {}).finally(() => setOLoading(false));
    }, []);

    if (oLoading) return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;

    const statusBadge = (status) => {
      const styles = {
        completed: 'bg-green-500/20 text-green-400 border-green-500/30',
        pending_delivery: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        delivered: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      };
      const labels = { completed: 'مكتمل', pending_delivery: 'بانتظار التسليم', delivered: 'تم التسليم', cancelled: 'ملغي' };
      return <Badge className={styles[status] || ''}>{labels[status] || status}</Badge>;
    };

    return (
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Package className="w-8 h-8 text-purple-400" />
          <span>طلباتي</span>
        </h1>
        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id} className="bg-[#12121f] border-purple-500/10 p-6 cursor-pointer hover:border-purple-500/30 transition-colors"
                onClick={() => navigate('order', order.id)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">#{order.id?.slice(0, 8)}</span>
                    {statusBadge(order.status)}
                  </div>
                  <span className="font-bold text-purple-400">${order.total?.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-400">
                  {order.items?.map(i => i.productName).join(' - ')}
                </div>
                <div className="text-xs text-gray-600 mt-2">{new Date(order.createdAt).toLocaleString('ar')}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============ ORDER DETAIL ============
  const OrderDetail = () => {
    const [order, setOrder] = useState(null);
    const [oLoading, setOLoading] = useState(true);

    useEffect(() => {
      if (!pageId) return;
      api(`/orders/${pageId}`, {}, token).then(setOrder).catch(() => {}).finally(() => setOLoading(false));
    }, [pageId]);

    if (oLoading) return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;
    if (!order) return <div className="text-center py-16 text-gray-500">الطلب غير موجود</div>;

    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">تفاصيل الطلب #{order.id?.slice(0, 8)}</h1>
        <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-gray-400 text-sm">الحالة</span>
              <div className="mt-1">
                <Badge className={order.status === 'completed' ? 'bg-green-500/20 text-green-400' : order.status === 'pending_delivery' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}>
                  {order.status === 'completed' ? 'مكتمل' : order.status === 'pending_delivery' ? 'بانتظار التسليم' : order.status === 'delivered' ? 'تم التسليم' : order.status}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">التاريخ</span>
              <p>{new Date(order.createdAt).toLocaleString('ar')}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">الإجمالي</span>
              <p className="text-2xl font-bold text-purple-400">${order.total?.toFixed(2)}</p>
            </div>
            {order.discountCode && (
              <div>
                <span className="text-gray-400 text-sm">كود الخصم</span>
                <p className="text-green-400">{order.discountCode} (-${order.discountAmount?.toFixed(2)})</p>
              </div>
            )}
          </div>
        </Card>

        {/* Items */}
        <div className="space-y-4">
          {order.items?.map((item, idx) => (
            <Card key={idx} className="bg-[#12121f] border-purple-500/10 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  {item.productImage ? (
                    <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-purple-900/30 flex items-center justify-center">
                      <Gamepad2 className="w-6 h-6 text-purple-500/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{item.productName}</h3>
                  <p className="text-sm text-gray-400">${item.price?.toFixed(2)} × {item.quantity}</p>
                </div>
              </div>
              {/* Delivered Codes */}
              {item.deliveredCodes?.length > 0 && (
                <div className="bg-[#0a0a15] rounded-lg p-4 mb-2">
                  <h4 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-1">
                    <Key className="w-4 h-4" /> الأكواد المسلمة:
                  </h4>
                  {item.deliveredCodes.map((code, ci) => (
                    <div key={ci} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
                      <code className="text-cyan-400 font-mono text-sm">{code}</code>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-purple-400 h-7"
                        onClick={() => { navigator.clipboard.writeText(code); toast.success('تم نسخ الكود'); }}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {item.pendingCount > 0 && (
                <div className="bg-orange-500/10 rounded-lg p-3 text-orange-400 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{item.pendingCount} كود بانتظار التسليم اليدوي</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // ============ LOGIN PAGE ============
  const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        if (isRegister) await handleRegister(name, email, password);
        else await handleLogin(email, password);
      } catch (e) { toast.error(e.message); }
      finally { setBusy(false); }
    };

    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
        <Card className="bg-[#12121f] border-purple-500/20 w-full max-w-md p-8 neon-glow">
          <div className="text-center mb-8">
            <Zap className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold">{isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'}</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <Label>الاسم</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required />
              </div>
            )}
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required />
            </div>
            <div>
              <Label>كلمة المرور</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required />
            </div>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 py-5" disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {isRegister ? 'إنشاء حساب' : 'دخول'}
            </Button>
          </form>
          <p className="text-center mt-4 text-sm text-gray-400">
            {isRegister ? 'لديك حساب؟' : 'ليس لديك حساب؟'}{' '}
            <button className="text-purple-400 hover:underline" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </button>
          </p>
        </Card>
      </div>
    );
  };

  // ============ ADMIN PANEL ============
  const AdminPanel = () => {
    const [adminTab, setAdminTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [allCategories, setAllCategories] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allDiscounts, setAllDiscounts] = useState([]);
    const [allSliders, setAllSliders] = useState([]);
    const [allFaqs, setAllFaqs] = useState([]);
    const [adminSettings, setAdminSettings] = useState({});
    const [codes, setCodes] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Dialogs
    const [showDialog, setShowDialog] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [dialogType, setDialogType] = useState('');

    // Delivery dialog
    const [showDeliverDialog, setShowDeliverDialog] = useState(false);
    const [deliverOrder, setDeliverOrder] = useState(null);
    const [deliverItemIndex, setDeliverItemIndex] = useState(0);
    const [deliverCodes, setDeliverCodes] = useState('');

    const loadData = useCallback(async (tab) => {
      try {
        if (tab === 'dashboard') {
          const s = await api('/stats', {}, token);
          setStats(s);
        }
        if (tab === 'categories') {
          const c = await api('/categories/all', {}, token);
          setAllCategories(c);
        }
        if (tab === 'products') {
          const p = await api('/products?all=true', {}, token);
          setAllProducts(p);
          const c = await api('/categories/all', {}, token);
          setAllCategories(c);
        }
        if (tab === 'codes') {
          const p = await api('/products?all=true', {}, token);
          setAllProducts(p);
        }
        if (tab === 'orders') {
          const o = await api('/orders', {}, token);
          setAllOrders(o);
        }
        if (tab === 'users') {
          const u = await api('/users', {}, token);
          setAllUsers(u);
        }
        if (tab === 'discounts') {
          const d = await api('/discounts', {}, token);
          setAllDiscounts(d);
        }
        if (tab === 'sliders') {
          const s = await api('/sliders', {}, token);
          setAllSliders(s);
        }
        if (tab === 'faqs') {
          const f = await api('/faqs', {}, token);
          setAllFaqs(f);
        }
        if (tab === 'settings') {
          const s = await api('/settings', {}, token);
          setAdminSettings(s);
        }
      } catch (e) { console.error(e); }
    }, [token]);

    useEffect(() => { loadData(adminTab); }, [adminTab, loadData]);

    const openForm = (type, item = null) => {
      setDialogType(type);
      setEditItem(item);
      setFormData(item || {});
      setShowDialog(true);
    };

    const saveForm = async () => {
      try {
        const isEdit = !!editItem?.id;
        let url = '';
        switch (dialogType) {
          case 'category': url = isEdit ? `/categories/${editItem.id}` : '/categories'; break;
          case 'product': url = isEdit ? `/products/${editItem.id}` : '/products'; break;
          case 'discount': url = isEdit ? `/discounts/${editItem.id}` : '/discounts'; break;
          case 'slider': url = isEdit ? `/sliders/${editItem.id}` : '/sliders'; break;
          case 'faq': url = isEdit ? `/faqs/${editItem.id}` : '/faqs'; break;
        }
        await api(url, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(formData) }, token);
        toast.success(isEdit ? 'تم التعديل بنجاح' : 'تمت الإضافة بنجاح');
        setShowDialog(false);
        loadData(adminTab);
        refreshData();
      } catch (e) { toast.error(e.message); }
    };

    const deleteItem = async (type, id) => {
      if (!confirm('هل أنت متأكد من الحذف؟')) return;
      try {
        const urls = { category: '/categories', product: '/products', discount: '/discounts', slider: '/sliders', faq: '/faqs', code: '/codes' };
        await api(`${urls[type]}/${id}`, { method: 'DELETE' }, token);
        toast.success('تم الحذف');
        loadData(adminTab);
        refreshData();
      } catch (e) { toast.error(e.message); }
    };

    const loadCodes = async (productId) => {
      setSelectedProduct(productId);
      const c = await api(`/codes?productId=${productId}`, {}, token);
      setCodes(c);
    };

    const addCodes = async (productId, codesText) => {
      const codesList = codesText.split('\n').filter(c => c.trim());
      await api('/codes', { method: 'POST', body: JSON.stringify({ productId, codes: codesList }) }, token);
      toast.success(`تمت إضافة ${codesList.length} كود`);
      loadCodes(productId);
    };

    const handleDeliver = async () => {
      try {
        const codesList = deliverCodes.split('\n').filter(c => c.trim());
        await api(`/orders/${deliverOrder.id}`, {
          method: 'PUT',
          body: JSON.stringify({ action: 'deliver', itemIndex: deliverItemIndex, codes: codesList })
        }, token);
        toast.success('تم التسليم');
        setShowDeliverDialog(false);
        loadData('orders');
      } catch (e) { toast.error(e.message); }
    };

    const saveSettings = async () => {
      try {
        const updated = await api('/settings', { method: 'PUT', body: JSON.stringify(adminSettings) }, token);
        setSettings(updated);
        toast.success('تم حفظ الإعدادات');
      } catch (e) { toast.error(e.message); }
    };

    const toggleUserBan = async (userId, banned) => {
      await api(`/users/${userId}`, { method: 'PUT', body: JSON.stringify({ banned: !banned }) }, token);
      toast.success(banned ? 'تم إلغاء الحظر' : 'تم الحظر');
      loadData('users');
    };

    const toggleUserRole = async (userId, role) => {
      const newRole = role === 'admin' ? 'user' : 'admin';
      await api(`/users/${userId}`, { method: 'PUT', body: JSON.stringify({ role: newRole }) }, token);
      toast.success('تم تغيير الدور');
      loadData('users');
    };

    const sidebarItems = [
      { id: 'dashboard', label: 'لوحة المعلومات', icon: BarChart3 },
      { id: 'products', label: 'المنتجات', icon: Package },
      { id: 'categories', label: 'الأقسام', icon: FolderOpen },
      { id: 'codes', label: 'المخزون', icon: Key },
      { id: 'orders', label: 'الطلبات', icon: ShoppingCart },
      { id: 'users', label: 'المستخدمين', icon: Users },
      { id: 'discounts', label: 'أكواد الخصم', icon: Tag },
      { id: 'sliders', label: 'السلايدر', icon: Image },
      { id: 'faqs', label: 'الأسئلة الشائعة', icon: HelpCircle },
      { id: 'settings', label: 'الإعدادات', icon: Settings },
    ];

    return (
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 bg-[#0a0a15] border-l border-purple-500/20 p-4 hidden lg:block">
          <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('home')}>
            <Zap className="w-8 h-8 text-purple-400" />
            <span className="font-bold text-lg neon-text">{settings.siteName}</span>
          </div>
          <nav className="space-y-1">
            {sidebarItems.map(item => (
              <button key={item.id} onClick={() => setAdminTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  adminTab === item.id ? 'bg-purple-600/20 text-purple-400 neon-glow' : 'text-gray-400 hover:bg-purple-500/10 hover:text-white'
                }`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
          <Separator className="my-4 bg-purple-500/20" />
          <button onClick={() => navigate('home')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-400 hover:bg-purple-500/10 hover:text-white">
            <Home className="w-5 h-5" /> العودة للمتجر
          </button>
        </aside>

        {/* Mobile sidebar */}
        <div className="lg:hidden p-4 border-b border-purple-500/20 w-full">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-purple-400">لوحة التحكم</span>
            <Button size="sm" variant="ghost" onClick={() => navigate('home')}>
              <Home className="w-4 h-4 ml-1" /> المتجر
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sidebarItems.map(item => (
              <Button key={item.id} size="sm" variant={adminTab === item.id ? 'default' : 'outline'}
                className={adminTab === item.id ? 'bg-purple-600' : 'border-purple-500/30'}
                onClick={() => setAdminTab(item.id)}>
                <item.icon className="w-3 h-3 ml-1" />
                <span className="text-xs">{item.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Dashboard */}
          {adminTab === 'dashboard' && stats && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">لوحة المعلومات</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'الإيرادات', value: `$${stats.totalRevenue?.toFixed(2)}`, icon: Zap, color: 'text-green-400' },
                  { label: 'الطلبات', value: stats.totalOrders, icon: ShoppingCart, color: 'text-blue-400' },
                  { label: 'المستخدمين', value: stats.totalUsers, icon: Users, color: 'text-purple-400' },
                  { label: 'بانتظار التسليم', value: stats.pendingOrders, icon: Clock, color: 'text-orange-400' },
                  { label: 'المنتجات', value: stats.totalProducts, icon: Package, color: 'text-cyan-400' },
                  { label: 'أكواد متوفرة', value: stats.availableCodes, icon: Key, color: 'text-green-400' },
                  { label: 'أكواد مباعة', value: stats.soldCodes, icon: Check, color: 'text-purple-400' },
                  { label: 'إجمالي الأكواد', value: stats.totalCodes, icon: Package, color: 'text-gray-400' },
                ].map((s, i) => (
                  <Card key={i} className="bg-[#12121f] border-purple-500/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-sm text-gray-400">{s.label}</p>
                  </Card>
                ))}
              </div>
              {/* Recent Orders */}
              <h3 className="font-bold mb-4">آخر الطلبات</h3>
              <div className="space-y-2">
                {stats.recentOrders?.map(o => (
                  <Card key={o.id} className="bg-[#12121f] border-purple-500/10 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-400">#{o.id?.slice(0, 8)}</span>
                      <span className="mr-3 text-sm">{o.userName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={o.status === 'completed' ? 'bg-green-500/20 text-green-400' : o.status === 'pending_delivery' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}>
                        {o.status === 'completed' ? 'مكتمل' : o.status === 'pending_delivery' ? 'بانتظار التسليم' : 'تم التسليم'}
                      </Badge>
                      <span className="font-bold text-purple-400">${o.total?.toFixed(2)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {adminTab === 'categories' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">الأقسام</h2>
                <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('category')}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة قسم
                </Button>
              </div>
              <div className="space-y-2">
                {allCategories.map(cat => (
                  <Card key={cat.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-purple-900/30">
                        {cat.image ? <img src={cat.image} alt="" className="w-full h-full object-cover" /> : <FolderOpen className="w-6 h-6 text-purple-500/50 m-3" />}
                      </div>
                      <div>
                        <p className="font-bold">{cat.name}</p>
                        <p className="text-xs text-gray-400">{cat.productCount || 0} منتج | ترتيب: {cat.order}</p>
                      </div>
                      <Badge className={cat.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {cat.active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('category', cat)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('category', cat.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {adminTab === 'products' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">المنتجات</h2>
                <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('product')}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة منتج
                </Button>
              </div>
              <div className="space-y-2">
                {allProducts.map(p => (
                  <Card key={p.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-purple-900/30">
                        {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-purple-500/50 m-3" />}
                      </div>
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-gray-400">${p.price?.toFixed(2)} | مخزون: {p.stock || 0}</p>
                      </div>
                      {p.discount > 0 && <Badge className="bg-red-500/20 text-red-400">خصم {p.discount}%</Badge>}
                      {p.featured && <Badge className="bg-yellow-500/20 text-yellow-400">مميز</Badge>}
                      <Badge className={p.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {p.active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('product', p)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('product', p.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Codes / Inventory */}
          {adminTab === 'codes' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">إدارة المخزون</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold mb-3">اختر المنتج</h3>
                  <div className="space-y-2 max-h-[60vh] overflow-auto">
                    {allProducts.map(p => (
                      <Card key={p.id}
                        className={`p-3 cursor-pointer transition-all ${selectedProduct === p.id ? 'bg-purple-600/20 border-purple-500/40' : 'bg-[#12121f] border-purple-500/10 hover:border-purple-500/30'}`}
                        onClick={() => loadCodes(p.id)}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{p.name}</span>
                          <Badge className="bg-purple-500/20 text-purple-400">{p.stock || 0} متوفر</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                <div>
                  {selectedProduct && (
                    <>
                      <h3 className="font-bold mb-3">الأكواد</h3>
                      <CodesManager productId={selectedProduct} codes={codes} onAddCodes={addCodes} onDelete={(id) => deleteItem('code', id)} onRefresh={() => loadCodes(selectedProduct)} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Orders */}
          {adminTab === 'orders' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">الطلبات</h2>
              <div className="space-y-2">
                {allOrders.map(o => (
                  <Card key={o.id} className="bg-[#12121f] border-purple-500/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">#{o.id?.slice(0, 8)}</span>
                        <span className="font-medium">{o.userName}</span>
                        <span className="text-xs text-gray-500">{o.userEmail}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={o.status === 'completed' ? 'bg-green-500/20 text-green-400' : o.status === 'pending_delivery' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}>
                          {o.status === 'completed' ? 'مكتمل' : o.status === 'pending_delivery' ? 'بانتظار التسليم' : 'تم التسليم'}
                        </Badge>
                        <span className="font-bold text-purple-400">${o.total?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      {o.items?.map(i => `${i.productName} (${i.quantity})`).join(' | ')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString('ar')}</span>
                      {o.status === 'pending_delivery' && (
                        <div className="flex gap-2">
                          {o.items?.map((item, idx) => (
                            item.pendingCount > 0 && (
                              <Button key={idx} size="sm" className="bg-orange-600 hover:bg-orange-500"
                                onClick={() => { setDeliverOrder(o); setDeliverItemIndex(idx); setDeliverCodes(''); setShowDeliverDialog(true); }}>
                                <Truck className="w-3 h-3 ml-1" /> تسليم {item.productName}
                              </Button>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {adminTab === 'users' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">المستخدمين</h2>
              <div className="space-y-2">
                {allUsers.map(u => (
                  <Card key={u.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold">
                        {u.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      <Badge className={u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}>
                        {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </Badge>
                      {u.banned && <Badge className="bg-red-500/20 text-red-400">محظور</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-purple-500/30"
                        onClick={() => toggleUserRole(u.id, u.role)}>
                        <Shield className="w-3 h-3 ml-1" /> {u.role === 'admin' ? 'إزالة الإدارة' : 'جعل مدير'}
                      </Button>
                      <Button size="sm" variant="outline" className={u.banned ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}
                        onClick={() => toggleUserBan(u.id, u.banned)}>
                        <Ban className="w-3 h-3 ml-1" /> {u.banned ? 'إلغاء الحظر' : 'حظر'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Discounts */}
          {adminTab === 'discounts' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">أكواد الخصم</h2>
                <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('discount')}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة كود
                </Button>
              </div>
              <div className="space-y-2">
                {allDiscounts.map(d => (
                  <Card key={d.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <code className="text-cyan-400 font-mono font-bold">{d.code}</code>
                      <Badge className="bg-purple-500/20 text-purple-400">
                        {d.type === 'percentage' ? `${d.value}%` : `$${d.value}`}
                      </Badge>
                      <span className="text-xs text-gray-400">استخدام: {d.currentUses}/{d.maxUses || '∞'}</span>
                      <Badge className={d.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {d.active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('discount', d)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('discount', d.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sliders */}
          {adminTab === 'sliders' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">السلايدر</h2>
                <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('slider')}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة صورة
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allSliders.map(s => (
                  <Card key={s.id} className="bg-[#12121f] border-purple-500/10 overflow-hidden">
                    <div className="h-40 overflow-hidden">
                      {s.image ? <img src={s.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-purple-900/30" />}
                    </div>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.title || 'بدون عنوان'}</p>
                        <p className="text-xs text-gray-400">ترتيب: {s.order}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('slider', s)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('slider', s.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* FAQs */}
          {adminTab === 'faqs' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">الأسئلة الشائعة</h2>
                <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('faq')}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة سؤال
                </Button>
              </div>
              <div className="space-y-2">
                {allFaqs.map(f => (
                  <Card key={f.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{f.question}</p>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">{f.answer}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('faq', f)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('faq', f.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {adminTab === 'settings' && (
            <div className="animate-fade-in max-w-2xl">
              <h2 className="text-2xl font-bold mb-6">الإعدادات</h2>
              <div className="space-y-6">
                <div>
                  <Label>اسم الموقع</Label>
                  <Input value={adminSettings.siteName || ''} onChange={(e) => setAdminSettings({ ...adminSettings, siteName: e.target.value })}
                    className="bg-[#0a0a15] border-purple-500/20 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>اللون الأساسي</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={adminSettings.primaryColor || '#8b5cf6'}
                        onChange={(e) => setAdminSettings({ ...adminSettings, primaryColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer" />
                      <Input value={adminSettings.primaryColor || ''} onChange={(e) => setAdminSettings({ ...adminSettings, primaryColor: e.target.value })}
                        className="bg-[#0a0a15] border-purple-500/20" />
                    </div>
                  </div>
                  <div>
                    <Label>اللون الثانوي</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={adminSettings.secondaryColor || '#22d3ee'}
                        onChange={(e) => setAdminSettings({ ...adminSettings, secondaryColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer" />
                      <Input value={adminSettings.secondaryColor || ''} onChange={(e) => setAdminSettings({ ...adminSettings, secondaryColor: e.target.value })}
                        className="bg-[#0a0a15] border-purple-500/20" />
                    </div>
                  </div>
                </div>
                <Separator className="bg-purple-500/20" />
                <h3 className="font-bold">معلومات التواصل</h3>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input value={adminSettings.contactEmail || ''} onChange={(e) => setAdminSettings({ ...adminSettings, contactEmail: e.target.value })}
                    className="bg-[#0a0a15] border-purple-500/20 mt-1" />
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input value={adminSettings.contactPhone || ''} onChange={(e) => setAdminSettings({ ...adminSettings, contactPhone: e.target.value })}
                    className="bg-[#0a0a15] border-purple-500/20 mt-1" />
                </div>
                <div>
                  <Label>واتساب</Label>
                  <Input value={adminSettings.contactWhatsapp || ''} onChange={(e) => setAdminSettings({ ...adminSettings, contactWhatsapp: e.target.value })}
                    className="bg-[#0a0a15] border-purple-500/20 mt-1" placeholder="رقم بصيغة دولية: 966XXXXXXXXX" />
                </div>
                <Button className="bg-purple-600 hover:bg-purple-500" onClick={saveSettings}>حفظ الإعدادات</Button>
              </div>
            </div>
          )}
        </main>

        {/* Form Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#12121f] border-purple-500/20 max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editItem?.id ? 'تعديل' : 'إضافة'} {dialogType === 'category' ? 'قسم' : dialogType === 'product' ? 'منتج' : dialogType === 'discount' ? 'كود خصم' : dialogType === 'slider' ? 'صورة سلايدر' : dialogType === 'faq' ? 'سؤال' : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-auto py-2">
              {/* Category Form */}
              {dialogType === 'category' && (
                <>
                  <div><Label>الاسم</Label><Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div><Label>رابط الصورة</Label><Input value={formData.image || ''} onChange={(e) => setFormData({ ...formData, image: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div><Label>الترتيب</Label><Input type="number" value={formData.order || 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.active !== false} onCheckedChange={(v) => setFormData({ ...formData, active: v })} /><Label>نشط</Label></div>
                </>
              )}
              {/* Product Form */}
              {dialogType === 'product' && (
                <>
                  <div><Label>الاسم</Label><Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div><Label>الوصف</Label><Textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>السعر ($)</Label><Input type="number" step="0.01" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                    <div><Label>نسبة الخصم (%)</Label><Input type="number" value={formData.discount || 0} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  </div>
                  <div><Label>القسم</Label>
                    <Select value={formData.categoryId || ''} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                      <SelectTrigger className="bg-[#0a0a15] border-purple-500/20 mt-1"><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                      <SelectContent className="bg-[#12121f] border-purple-500/20">
                        {allCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>رابط الصورة</Label><Input value={formData.image || ''} onChange={(e) => setFormData({ ...formData, image: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><Switch checked={formData.active !== false} onCheckedChange={(v) => setFormData({ ...formData, active: v })} /><Label>نشط</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={formData.featured || false} onCheckedChange={(v) => setFormData({ ...formData, featured: v })} /><Label>مميز</Label></div>
                  </div>
                </>
              )}
              {/* Discount Form */}
              {dialogType === 'discount' && (
                <>
                  <div><Label>الكود</Label><Input value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div><Label>النوع</Label>
                    <Select value={formData.type || 'percentage'} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger className="bg-[#0a0a15] border-purple-500/20 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#12121f] border-purple-500/20">
                        <SelectItem value="percentage">نسبة مئوية</SelectItem>
                        <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>القيمة</Label><Input type="number" value={formData.value || ''} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                    <div><Label>الحد الأدنى للطلب</Label><Input type="number" value={formData.minOrder || ''} onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  </div>
                  <div><Label>الحد الأقصى للاستخدام (0 = غير محدود)</Label><Input type="number" value={formData.maxUses || ''} onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.active !== false} onCheckedChange={(v) => setFormData({ ...formData, active: v })} /><Label>نشط</Label></div>
                </>
              )}
              {/* Slider Form */}
              {dialogType === 'slider' && (
                <>
                  <div><Label>رابط الصورة</Label><Input value={formData.image || ''} onChange={(e) => setFormData({ ...formData, image: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div><Label>العنوان</Label><Input value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div><Label>الرابط</Label><Input value={formData.link || ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div><Label>الترتيب</Label><Input type="number" value={formData.order || 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.active !== false} onCheckedChange={(v) => setFormData({ ...formData, active: v })} /><Label>نشط</Label></div>
                </>
              )}
              {/* FAQ Form */}
              {dialogType === 'faq' && (
                <>
                  <div><Label>السؤال</Label><Input value={formData.question || ''} onChange={(e) => setFormData({ ...formData, question: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div><Label>الجواب</Label><Textarea value={formData.answer || ''} onChange={(e) => setFormData({ ...formData, answer: e.target.value })} className="bg-[#0a0a15] border-purple-500/20 mt-1" rows={4} /></div>
                  <div><Label>الترتيب</Label><Input type="number" value={formData.order || 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.active !== false} onCheckedChange={(v) => setFormData({ ...formData, active: v })} /><Label>نشط</Label></div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-purple-500/30" onClick={() => setShowDialog(false)}>إلغاء</Button>
              <Button className="bg-purple-600 hover:bg-purple-500" onClick={saveForm}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deliver Dialog */}
        <Dialog open={showDeliverDialog} onOpenChange={setShowDeliverDialog}>
          <DialogContent className="bg-[#12121f] border-purple-500/20">
            <DialogHeader>
              <DialogTitle>تسليم يدوي</DialogTitle>
            </DialogHeader>
            {deliverOrder && (
              <div>
                <p className="text-sm text-gray-400 mb-2">الطلب: #{deliverOrder.id?.slice(0, 8)}</p>
                <p className="text-sm text-gray-400 mb-4">المنتج: {deliverOrder.items?.[deliverItemIndex]?.productName}</p>
                <p className="text-sm text-orange-400 mb-2">عدد الأكواد المطلوبة: {deliverOrder.items?.[deliverItemIndex]?.pendingCount}</p>
                <Label>الأكواد (كل كود في سطر)</Label>
                <Textarea value={deliverCodes} onChange={(e) => setDeliverCodes(e.target.value)}
                  className="bg-[#0a0a15] border-purple-500/20 mt-1 font-mono" rows={5} placeholder="XXXXX-XXXXX-XXXXX" />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" className="border-purple-500/30" onClick={() => setShowDeliverDialog(false)}>إلغاء</Button>
              <Button className="bg-orange-600 hover:bg-orange-500" onClick={handleDeliver}>تسليم</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ============ CODES MANAGER ============
  const CodesManager = ({ productId, codes, onAddCodes, onDelete, onRefresh }) => {
    const [newCodes, setNewCodes] = useState('');

    return (
      <div>
        <Card className="bg-[#12121f] border-purple-500/10 p-4 mb-4">
          <Label>إضافة أكواد جديدة (كل كود في سطر)</Label>
          <Textarea value={newCodes} onChange={(e) => setNewCodes(e.target.value)}
            className="bg-[#0a0a15] border-purple-500/20 mt-2 font-mono" rows={5}
            placeholder={"XXXXX-XXXXX-XXXXX\nYYYYY-YYYYY-YYYYY\nZZZZZ-ZZZZZ-ZZZZZ"} />
          <Button className="bg-purple-600 hover:bg-purple-500 mt-3" onClick={() => { onAddCodes(productId, newCodes); setNewCodes(''); }}>
            <Plus className="w-4 h-4 ml-1" /> إضافة الأكواد
          </Button>
        </Card>
        <div className="space-y-1 max-h-[40vh] overflow-auto">
          {codes.map(code => (
            <div key={code.id} className="flex items-center justify-between bg-[#0a0a15] rounded-lg p-3 text-sm">
              <div className="flex items-center gap-3">
                <Badge className={code.status === 'available' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                  {code.status === 'available' ? 'متوفر' : 'مباع'}
                </Badge>
                <code className="font-mono text-cyan-400">{code.code}</code>
              </div>
              {code.status === 'available' && (
                <Button size="sm" variant="ghost" className="text-red-400 h-7" onClick={() => onDelete(code.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
          {codes.length === 0 && <p className="text-center text-gray-500 py-4">لا توجد أكواد</p>}
        </div>
      </div>
    );
  };

  // ============ FOOTER ============
  const Footer = () => (
    <footer className="border-t border-purple-500/10 mt-16 py-8 text-center text-gray-500 text-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-purple-500" />
          <span className="font-bold text-gray-400">{settings.siteName || 'FAST STORE'}</span>
        </div>
        <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()}</p>
      </div>
    </footer>
  );

  // ============ RENDER ============
  return (
    <div className="min-h-screen">
      <Toaster theme="dark" position="top-center" richColors />
      {page === 'admin' && user?.role === 'admin' ? (
        <AdminPanel />
      ) : (
        <>
          <Header />
          <main className="container mx-auto px-4 py-6">
            {page === 'home' && <HomePage />}
            {page === 'search' && <HomePage />}
            {page === 'category' && <CategoryPage />}
            {page === 'product' && <ProductDetail />}
            {page === 'cart' && <CartPage />}
            {page === 'checkout' && <CheckoutPage />}
            {page === 'orders' && <OrdersPage />}
            {page === 'order' && <OrderDetail />}
            {page === 'login' && <LoginPage />}
            {page === 'register' && <LoginPage />}
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}

// ============ SETUP ADMIN PAGE ============
function SetupAdminPage({ onSetup }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSetup(name, email, password);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4">
      <Toaster theme="dark" position="top-center" richColors />
      <Card className="bg-[#12121f] border-purple-500/20 w-full max-w-md p-8 neon-glow">
        <div className="text-center mb-8">
          <Crown className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-float" />
          <h1 className="text-2xl font-bold neon-text">إعداد المتجر</h1>
          <p className="text-gray-400 mt-2">أنشئ حساب المدير الأول</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>الاسم</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required />
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required />
          </div>
          <div>
            <Label>كلمة المرور</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required />
          </div>
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 py-5" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Zap className="w-4 h-4 ml-2" />}
            إنشاء حساب المدير
          </Button>
        </form>
      </Card>
    </div>
  );
}
