'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  ChevronRight, Package, FolderOpen, Key, Users, Tag, Image as ImageIcon, HelpCircle,
  Settings, BarChart3, Shield, Ban, Check, X, Edit, Copy,
  Gamepad2, Zap, Crown, Clock, Mail, Phone, Send,
  Menu, Home, Loader2, CheckCircle, Truck,
  Upload, MessageCircle, DollarSign, Lock, UserCog, MessageSquare
} from 'lucide-react';

const CURRENCIES = {
  USD: { symbol: '$', name: 'دولار أمريكي', flag: '🇺🇸' }, SAR: { symbol: 'ر.س', name: 'ريال سعودي', flag: '🇸🇦' },
  KWD: { symbol: 'د.ك', name: 'دينار كويتي', flag: '🇰🇼' }, AED: { symbol: 'د.إ', name: 'درهم إماراتي', flag: '🇦🇪' },
  BHD: { symbol: 'د.ب', name: 'دينار بحريني', flag: '🇧🇭' }, QAR: { symbol: 'ر.ق', name: 'ريال قطري', flag: '🇶🇦' },
  OMR: { symbol: 'ر.ع', name: 'ريال عماني', flag: '🇴🇲' },
};

const COUNTRY_CODES = [
  // الدول العربية
  { code: '+966', name: 'السعودية', flag: '🇸🇦' }, { code: '+971', name: 'الإمارات', flag: '🇦🇪' },
  { code: '+965', name: 'الكويت', flag: '🇰🇼' }, { code: '+973', name: 'البحرين', flag: '🇧🇭' },
  { code: '+974', name: 'قطر', flag: '🇶🇦' }, { code: '+968', name: 'عمان', flag: '🇴🇲' },
  { code: '+962', name: 'الأردن', flag: '🇯🇴' }, { code: '+961', name: 'لبنان', flag: '🇱🇧' },
  { code: '+963', name: 'سوريا', flag: '🇸🇾' }, { code: '+964', name: 'العراق', flag: '🇮🇶' },
  { code: '+970', name: 'فلسطين', flag: '🇵🇸' }, { code: '+967', name: 'اليمن', flag: '🇾🇪' },
  { code: '+20', name: 'مصر', flag: '🇪🇬' }, { code: '+249', name: 'السودان', flag: '🇸🇩' },
  { code: '+218', name: 'ليبيا', flag: '🇱🇾' }, { code: '+216', name: 'تونس', flag: '🇹🇳' },
  { code: '+213', name: 'الجزائر', flag: '🇩🇿' }, { code: '+212', name: 'المغرب', flag: '🇲🇦' },
  { code: '+222', name: 'موريتانيا', flag: '🇲🇷' }, { code: '+253', name: 'جيبوتي', flag: '🇩🇯' },
  { code: '+252', name: 'الصومال', flag: '🇸🇴' }, { code: '+269', name: 'جزر القمر', flag: '🇰🇲' },
  // أوروبا
  { code: '+44', name: 'بريطانيا', flag: '🇬🇧' }, { code: '+33', name: 'فرنسا', flag: '🇫🇷' },
  { code: '+49', name: 'ألمانيا', flag: '🇩🇪' }, { code: '+39', name: 'إيطاليا', flag: '🇮🇹' },
  { code: '+34', name: 'إسبانيا', flag: '🇪🇸' }, { code: '+351', name: 'البرتغال', flag: '🇵🇹' },
  { code: '+31', name: 'هولندا', flag: '🇳🇱' }, { code: '+32', name: 'بلجيكا', flag: '🇧🇪' },
  { code: '+41', name: 'سويسرا', flag: '🇨🇭' }, { code: '+43', name: 'النمسا', flag: '🇦🇹' },
  { code: '+46', name: 'السويد', flag: '🇸🇪' }, { code: '+47', name: 'النرويج', flag: '🇳🇴' },
  { code: '+45', name: 'الدنمارك', flag: '🇩🇰' }, { code: '+358', name: 'فنلندا', flag: '🇫🇮' },
  { code: '+48', name: 'بولندا', flag: '🇵🇱' }, { code: '+420', name: 'التشيك', flag: '🇨🇿' },
  { code: '+36', name: 'المجر', flag: '🇭🇺' }, { code: '+40', name: 'رومانيا', flag: '🇷🇴' },
  { code: '+30', name: 'اليونان', flag: '🇬🇷' }, { code: '+90', name: 'تركيا', flag: '🇹🇷' },
  { code: '+7', name: 'روسيا', flag: '🇷🇺' }, { code: '+380', name: 'أوكرانيا', flag: '🇺🇦' },
  { code: '+353', name: 'أيرلندا', flag: '🇮🇪' }, { code: '+354', name: 'آيسلندا', flag: '🇮🇸' },
  // أمريكا
  { code: '+1', name: 'أمريكا/كندا', flag: '🇺🇸' }, { code: '+52', name: 'المكسيك', flag: '🇲🇽' },
  { code: '+55', name: 'البرازيل', flag: '🇧🇷' }, { code: '+54', name: 'الأرجنتين', flag: '🇦🇷' },
  { code: '+56', name: 'تشيلي', flag: '🇨🇱' }, { code: '+57', name: 'كولومبيا', flag: '🇨🇴' },
  { code: '+51', name: 'بيرو', flag: '🇵🇪' }, { code: '+58', name: 'فنزويلا', flag: '🇻🇪' },
  { code: '+593', name: 'الإكوادور', flag: '🇪🇨' }, { code: '+591', name: 'بوليفيا', flag: '🇧🇴' },
  { code: '+595', name: 'باراغواي', flag: '🇵🇾' }, { code: '+598', name: 'أوروغواي', flag: '🇺🇾' },
  // آسيا
  { code: '+86', name: 'الصين', flag: '🇨🇳' }, { code: '+81', name: 'اليابان', flag: '🇯🇵' },
  { code: '+82', name: 'كوريا الجنوبية', flag: '🇰🇷' }, { code: '+91', name: 'الهند', flag: '🇮🇳' },
  { code: '+92', name: 'باكستان', flag: '🇵🇰' }, { code: '+880', name: 'بنغلاديش', flag: '🇧🇩' },
  { code: '+98', name: 'إيران', flag: '🇮🇷' }, { code: '+93', name: 'أفغانستان', flag: '🇦🇫' },
  { code: '+66', name: 'تايلاند', flag: '🇹🇭' }, { code: '+60', name: 'ماليزيا', flag: '🇲🇾' },
  { code: '+65', name: 'سنغافورة', flag: '🇸🇬' }, { code: '+62', name: 'إندونيسيا', flag: '🇮🇩' },
  { code: '+63', name: 'الفلبين', flag: '🇵🇭' }, { code: '+84', name: 'فيتنام', flag: '🇻🇳' },
  { code: '+95', name: 'ميانمار', flag: '🇲🇲' }, { code: '+977', name: 'نيبال', flag: '🇳🇵' },
  { code: '+94', name: 'سريلانكا', flag: '🇱🇰' }, { code: '+975', name: 'بوتان', flag: '🇧🇹' },
  { code: '+976', name: 'منغوليا', flag: '🇲🇳' }, { code: '+855', name: 'كمبوديا', flag: '🇰🇭' },
  { code: '+856', name: 'لاوس', flag: '🇱🇦' }, { code: '+673', name: 'بروناي', flag: '🇧🇳' },
  // أفريقيا
  { code: '+234', name: 'نيجيريا', flag: '🇳🇬' }, { code: '+254', name: 'كينيا', flag: '🇰🇪' },
  { code: '+27', name: 'جنوب أفريقيا', flag: '🇿🇦' }, { code: '+233', name: 'غانا', flag: '🇬🇭' },
  { code: '+255', name: 'تنزانيا', flag: '🇹🇿' }, { code: '+256', name: 'أوغندا', flag: '🇺🇬' },
  { code: '+251', name: 'إثيوبيا', flag: '🇪🇹' }, { code: '+260', name: 'زامبيا', flag: '🇿🇲' },
  { code: '+263', name: 'زيمبابوي', flag: '🇿🇼' }, { code: '+237', name: 'الكاميرون', flag: '🇨🇲' },
  { code: '+225', name: 'ساحل العاج', flag: '🇨🇮' }, { code: '+221', name: 'السنغال', flag: '🇸🇳' },
  { code: '+250', name: 'رواندا', flag: '🇷🇼' }, { code: '+257', name: 'بوروندي', flag: '🇧🇮' },
  // أوقيانوسيا
  { code: '+61', name: 'أستراليا', flag: '🇦🇺' }, { code: '+64', name: 'نيوزيلندا', flag: '🇳🇿' },
  { code: '+679', name: 'فيجي', flag: '🇫🇯' }, { code: '+675', name: 'بابوا غينيا', flag: '🇵🇬' },
];

async function api(url, opts = {}, token = '') {
  const headers = opts.isFormData ? {} : { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const fetchOpts = { ...opts, headers: { ...headers, ...opts.headers } };
  if (opts.isFormData) { delete fetchOpts.headers['Content-Type']; delete fetchOpts.isFormData; }
  const r = await fetch(`/api${url}`, fetchOpts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'خطأ');
  return data;
}

function ImageUploader({ value, onChange, token }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const data = await api('/upload', { method: 'POST', body: fd, isFormData: true }, token);
      onChange(data.url); toast.success('تم رفع الصورة');
    } catch (err) { toast.error(err.message); } finally { setUploading(false); }
  };
  return (
    <div className="space-y-2">
      {value && <div className="relative w-full h-32 rounded-lg overflow-hidden bg-[#0a0a15] border border-purple-500/20">
        <img src={value} alt="" className="w-full h-full object-contain" />
        <button onClick={() => onChange('')} className="absolute top-2 left-2 bg-red-500/80 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
      </div>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="border-purple-500/30 flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Upload className="w-4 h-4 ml-1" />}{uploading ? 'جاري الرفع...' : 'رفع صورة'}
        </Button>
        <Input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <Input placeholder="أو رابط صورة" value={value || ''} onChange={(e) => onChange(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 flex-1" />
      </div>
    </div>
  );
}

function StarRating({ rating, onRate, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (<div className="flex gap-0.5 flex-row-reverse" dir="ltr">
    {[1,2,3,4,5].map(i => <Star key={i} className={`${sz} cursor-pointer transition-colors ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} onClick={() => onRate?.(i)} />)}
  </div>);
}

function HeroSlider({ sliders }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: 'rtl' });
  useEffect(() => { if (!emblaApi || sliders.length <= 1) return; const i = setInterval(() => emblaApi.scrollNext(), 5000); return () => clearInterval(i); }, [emblaApi, sliders.length]);
  if (!sliders.length) return null;
  return (
    <div className="relative mb-8 group">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}><div className="flex">
        {sliders.map(s => <div key={s.id} className="flex-[0_0_100%] min-w-0"><div className="relative h-[200px] sm:h-[300px] md:h-[400px] overflow-hidden rounded-xl">
          <img src={s.image} alt={s.title} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {s.title && <div className="absolute bottom-6 right-6"><h2 className="text-2xl md:text-4xl font-bold neon-text text-white">{s.title}</h2></div>}
        </div></div>)}
      </div></div>
      {sliders.length > 1 && <>
        <button onClick={() => emblaApi?.scrollPrev()} className="absolute top-1/2 right-3 -translate-y-1/2 bg-black/50 hover:bg-purple-600/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all"><ChevronRight className="w-5 h-5" /></button>
        <button onClick={() => emblaApi?.scrollNext()} className="absolute top-1/2 left-3 -translate-y-1/2 bg-black/50 hover:bg-purple-600/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all"><ChevronLeft className="w-5 h-5" /></button>
      </>}
    </div>
  );
}

function ReviewsCarousel({ reviews }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: 'rtl', align: 'start' });
  useEffect(() => { if (!emblaApi || reviews.length <= 1) return; const i = setInterval(() => emblaApi.scrollNext(), 3000); return () => clearInterval(i); }, [emblaApi, reviews.length]);
  if (!reviews.length) return null;
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Star className="w-6 h-6 text-yellow-400" /> تقييمات الزبائن</h2>
      <div className="relative group">
        <div className="overflow-hidden" ref={emblaRef}><div className="flex gap-4">
          {reviews.map(r => <div key={r.id} className="flex-[0_0_100%] sm:flex-[0_0_48%] lg:flex-[0_0_31%] min-w-0">
            <Card className="bg-[#12121f] border-purple-500/10 p-5 h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold">{r.userName?.charAt(0)}</div>
                <div><p className="font-medium">{r.userName}</p><StarRating rating={r.rating} /></div>
              </div>
              {r.comment && <p className="text-gray-400 text-sm">{r.comment}</p>}
            </Card>
          </div>)}
        </div></div>
        {reviews.length > 1 && <>
          <button onClick={() => emblaApi?.scrollPrev()} className="absolute top-1/2 right-0 -translate-y-1/2 bg-black/60 hover:bg-purple-600/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => emblaApi?.scrollNext()} className="absolute top-1/2 left-0 -translate-y-1/2 bg-black/60 hover:bg-purple-600/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all"><ChevronLeft className="w-4 h-4" /></button>
        </>}
      </div>
    </section>
  );
}

function ProductCard({ product, onView, onAddToCart, formatPrice }) {
  const fp = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price;
  return (
    <Card className="group bg-[#12121f] border-purple-500/10 hover:border-purple-500/40 transition-all duration-500 overflow-hidden hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] cursor-pointer animate-fade-in" onClick={() => onView(product.id)}>
      <div className="relative overflow-hidden h-48">
        {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        : <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-cyan-900/40 flex items-center justify-center"><Gamepad2 className="w-12 h-12 text-purple-400/50" /></div>}
        {product.discount > 0 && <Badge className="absolute top-3 left-3 bg-red-500/90 text-white border-0 animate-pulse">خصم {product.discount}%</Badge>}
        {/* Stock badge removed - orders can be placed even when stock is 0 */}
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-2 text-white group-hover:text-purple-400 transition-colors line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-2 mb-2"><StarRating rating={Math.round(product.avgRating || 0)} /><span className="text-xs text-gray-400">({product.reviewCount || 0})</span></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-purple-400">{formatPrice(fp)}</span>
            {product.discount > 0 && <span className="text-sm text-gray-500 line-through">{formatPrice(product.price)}</span>}
          </div>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-500" onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}><Plus className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [cart, setCart] = useState(() => {
    // Lazy initialization - load cart from localStorage immediately
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('cart');
        return savedCart ? JSON.parse(savedCart) : [];
      } catch (error) {
        console.error('Error loading cart:', error);
        return [];
      }
    }
    return [];
  });
  const [page, setPage] = useState('home');
  const [pageId, setPageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [settings, setSettings] = useState({ siteName: 'FAST STORE' });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currency, setCurrency] = useState(() => {
    // Also load saved currency
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currency');
      return saved && CURRENCIES[saved] ? saved : 'USD';
    }
    return 'USD';
  });
  const [exchangeRates, setExchangeRates] = useState({ USD:1 });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [sliders, setSliders] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [approvedReviews, setApprovedReviews] = useState([]);

  const formatPrice = useCallback((p) => {
    const r = exchangeRates[currency] || 1;
    return `${(p * r).toFixed(2)} ${CURRENCIES[currency]?.symbol || '$'}`;
  }, [currency, exchangeRates]);

  const navigate = useCallback((p, id = null) => { setPage(p); setPageId(id); window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenu(false); }, []);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const ex = prev.find(i => i.productId === product.id);
      if (ex) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      const fp = product.discount > 0 ? Math.round(product.price * (1 - product.discount / 100) * 100) / 100 : product.price;
      return [...prev, { productId: product.id, name: product.name, image: product.image, price: fp, quantity: 1 }];
    });
    toast.success('تمت الإضافة إلى السلة');
  }, []);
  const updateCartQty = useCallback((pid, qty) => { qty <= 0 ? setCart(p => p.filter(i => i.productId !== pid)) : setCart(p => p.map(i => i.productId === pid ? { ...i, quantity: qty } : i)); }, []);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => { cart.length > 0 ? localStorage.setItem('cart', JSON.stringify(cart)) : localStorage.removeItem('cart'); }, [cart]);

  useEffect(() => {
    async function init() {
      try {
        // Cart is now loaded via lazy initialization in useState
        // const sc = localStorage.getItem('cart'); if (sc) setCart(JSON.parse(sc));
        // Currency is also loaded via lazy initialization
        // const sv = localStorage.getItem('currency'); if (sv && CURRENCIES[sv]) setCurrency(sv);
        
        // Check for PayPal success callback
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const orderId = urlParams.get('order');
        
        if (paymentStatus === 'success' && orderId) {
          // Clear cart after successful PayPal payment
          setCart([]);
          localStorage.removeItem('cart');
          toast.success('🎉 تم الدفع بنجاح! شكراً لك');
          // Navigate to order page
          setTimeout(() => {
            navigate('order', orderId);
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          }, 1000);
        } else if (paymentStatus === 'cancelled' && orderId) {
          toast.error('تم إلغاء عملية الدفع. يمكنك المحاولة مرة أخرى.');
          navigate('cart');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Check for Google OAuth session_id in URL hash
        if (window.location.hash.includes('session_id=')) {
          const sessionId = window.location.hash.split('session_id=')[1]?.split('&')[0];
          if (sessionId) {
            try {
              const authData = await api('/google-auth/google-session', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) });
              setUser(authData.user);
              setToken(authData.token);
              localStorage.setItem('token', authData.token);
              toast.success('تم تسجيل الدخول عبر Google');
              window.location.hash = ''; // Clear hash
              setPage('home');
            } catch (e) {
              toast.error('فشل تسجيل الدخول عبر Google');
              console.error('Google OAuth error:', e);
            }
          }
        }
        
        // Check reset token in URL
        const resetToken = urlParams.get('reset');
        if (resetToken) { setPage('reset-password'); setPageId(resetToken); }

        const st = localStorage.getItem('token');
        if (st) { setToken(st); const { user: u } = await api('/auth/session', {}, st); if (u) setUser(u); else { localStorage.removeItem('token'); setToken(''); } }
        const [ac, sd, cats, prods, slids, faqsD, ratesD, revs] = await Promise.all([
          api('/auth/check-admin'), api('/settings').catch(() => ({})),
          api('/categories').catch(() => []), api('/products').catch(() => []),
          api('/sliders').catch(() => []), api('/faqs').catch(() => []),
          api('/exchange-rates').catch(() => ({ rates: {} })),
          api('/reviews?approved=true').catch(() => []),
        ]);
        setHasAdmin(ac.hasAdmin); if (sd.siteName) setSettings(sd);
        setCategories(Array.isArray(cats) ? cats : []); setProducts(Array.isArray(prods) ? prods : []);
        setSliders(Array.isArray(slids) ? slids : []); setFaqs(Array.isArray(faqsD) ? faqsD : []);
        if (ratesD?.rates) setExchangeRates(ratesD.rates);
        setApprovedReviews(Array.isArray(revs) ? revs : []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    init();
  }, []);

  // Dynamic favicon & OG
  useEffect(() => {
    if (settings.favicon) {
      let link = document.querySelector("link[rel*='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'shortcut icon'; document.head.appendChild(link); }
      link.href = settings.favicon;
    }
    if (settings.ogImage) {
      let meta = document.querySelector("meta[property='og:image']");
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute('property', 'og:image'); document.head.appendChild(meta); }
      meta.setAttribute('content', settings.ogImage.startsWith('/') ? `${window.location.origin}${settings.ogImage}` : settings.ogImage);
    }
    if (settings.siteName) document.title = settings.siteName + ' - متجر البطاقات الرقمية';
  }, [settings]);

  const handleLogin = async (email, pw) => { const d = await api('/auth/login', { method:'POST', body:JSON.stringify({email,password:pw}) }); setUser(d.user); setToken(d.token); localStorage.setItem('token',d.token); toast.success('تم تسجيل الدخول'); navigate('home'); };
  const handleRegister = async (name, email, pw) => { const d = await api('/auth/register', { method:'POST', body:JSON.stringify({name,email,password:pw}) }); setUser(d.user); setToken(d.token); localStorage.setItem('token',d.token); toast.success('تم إنشاء الحساب'); navigate('home'); };
  const handleLogout = async () => { await api('/auth/logout',{method:'POST'},token).catch(()=>{}); setUser(null); setToken(''); localStorage.removeItem('token'); toast.success('تم تسجيل الخروج'); navigate('home'); };
  const handleSetupAdmin = async (name, email, pw) => { const d = await api('/auth/setup-admin',{method:'POST',body:JSON.stringify({name,email,password:pw})}); setUser(d.user); setToken(d.token); localStorage.setItem('token',d.token); setHasAdmin(true); toast.success('تم إنشاء حساب المدير'); };
  const refreshData = useCallback(async () => {
    const [c,p,s,f,r] = await Promise.all([api('/categories').catch(()=>[]),api('/products').catch(()=>[]),api('/sliders').catch(()=>[]),api('/faqs').catch(()=>[]),api('/reviews?approved=true').catch(()=>[])]);
    setCategories(Array.isArray(c)?c:[]); setProducts(Array.isArray(p)?p:[]); setSliders(Array.isArray(s)?s:[]); setFaqs(Array.isArray(f)?f:[]); setApprovedReviews(Array.isArray(r)?r:[]);
  }, []);
  const changeCurrency = (c) => { setCurrency(c); localStorage.setItem('currency', c); };

  if (loading) return (<div className="min-h-screen bg-[#09090b] flex items-center justify-center"><Toaster theme="dark" position="top-center" richColors /><div className="text-center animate-pulse"><Gamepad2 className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-float" /><p className="text-purple-400 text-xl font-bold neon-text">جاري التحميل...</p></div></div>);
  if (!hasAdmin) return <SetupPage onSetup={handleSetupAdmin} />;

  const Header = () => (
    <header className="sticky top-0 z-50 glass-card border-b border-purple-500/20">
      <div className="container mx-auto px-4 py-3"><div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('home')}>
          {settings.logo ? <img src={settings.logo} alt="" className="h-8 w-auto" /> : <Zap className="w-8 h-8 text-purple-400" />}
          <span className="text-xl font-black text-white neon-text">{settings.siteName || 'FAST STORE'}</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => navigate('home')} className={`text-sm font-medium hover:text-purple-400 ${page==='home'?'text-purple-400':'text-gray-300'}`}>الرئيسية</button>
          {categories.slice(0,5).map(c => <button key={c.id} onClick={() => navigate('category',c.id)} className={`text-sm font-medium hover:text-purple-400 ${page==='category'&&pageId===c.id?'text-purple-400':'text-gray-300'}`}>{c.name}</button>)}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-[#1a1a2e] rounded-lg border border-purple-500/20 px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-400 ml-2" />
            <input 
              type="text" 
              placeholder="بحث..." 
              className="bg-transparent text-sm text-white outline-none w-28" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && searchQuery.trim()) {
                  e.preventDefault();
                  navigate('search');
                }
              }} 
            />
          </div>
          <Select value={currency} onValueChange={changeCurrency}>
            <SelectTrigger className="w-[100px] bg-[#1a1a2e] border-purple-500/20 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#12121f] border-purple-500/20">{Object.entries(CURRENCIES).map(([k,v]) => <SelectItem key={k} value={k}><span className="flex items-center gap-2">{v.flag} {v.symbol} {k} - {v.name}</span></SelectItem>)}</SelectContent>
          </Select>
          <button onClick={() => navigate('cart')} className="relative p-2 hover:bg-purple-500/20 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-gray-300" />
            {cartCount > 0 && <span className="absolute -top-1 -left-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">{cartCount}</span>}
          </button>
          {user ? (<div className="flex items-center gap-1">
            {user.role === 'admin' && <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-400 hidden sm:flex" onClick={() => navigate('admin')}><Crown className="w-4 h-4 ml-1" /> لوحة التحكم</Button>}
            <Button size="sm" variant="ghost" className="text-gray-300" onClick={() => navigate('orders')}><Package className="w-4 h-4 ml-1" /><span className="hidden sm:inline">طلباتي</span></Button>
            <Button size="sm" variant="ghost" className="text-gray-300" onClick={() => navigate('profile')}><UserCog className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-400" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
          </div>) : <Button size="sm" className="bg-purple-600 hover:bg-purple-500" onClick={() => navigate('login')}><User className="w-4 h-4 ml-1" /> دخول</Button>}
          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}><Menu className="w-5 h-5 text-gray-300" /></button>
        </div>
      </div>
      {mobileMenu && <nav className="md:hidden mt-3 py-3 border-t border-purple-500/20 flex flex-col gap-2 animate-slide-up">
        <button onClick={() => navigate('home')} className="text-right text-gray-300 hover:text-purple-400 py-1">الرئيسية</button>
        {categories.map(c => <button key={c.id} onClick={() => navigate('category',c.id)} className="text-right text-gray-300 hover:text-purple-400 py-1">{c.name}</button>)}
        {user?.role === 'admin' && <button onClick={() => navigate('admin')} className="text-right text-purple-400 py-1 font-medium">لوحة التحكم</button>}
      </nav>}
      </div>
    </header>
  );

  const HomePage = () => {
    const featured = products.filter(p => p.featured);
    const filtered = searchQuery && page === 'search' ? products.filter(p => p.name.includes(searchQuery)) : products;
    return (<div className="animate-fade-in">
      <HeroSlider sliders={sliders} />
      {categories.length > 0 && <section className="mb-10"><h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><FolderOpen className="w-6 h-6 text-purple-400" /> الأقسام</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">{categories.map(c => (
          <Card key={c.id} className="group bg-[#12121f] border-purple-500/10 hover:border-purple-500/40 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]" onClick={() => navigate('category',c.id)}>
            <div className="h-28 overflow-hidden">{c.image ? <img src={c.image} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-cyan-900/30 flex items-center justify-center"><Gamepad2 className="w-10 h-10 text-purple-500/40" /></div>}</div>
            <CardContent className="p-3 text-center"><h3 className="font-bold text-sm group-hover:text-purple-400 transition-colors">{c.name}</h3><p className="text-xs text-gray-500 mt-1">{c.productCount||0} منتج</p></CardContent>
          </Card>))}</div></section>}
      {featured.length > 0 && <section className="mb-10"><h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Crown className="w-6 h-6 text-yellow-400" /> المنتجات المميزة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{featured.map(p => <ProductCard key={p.id} product={p} onView={id => navigate('product',id)} onAddToCart={addToCart} formatPrice={formatPrice} />)}</div></section>}
      <section className="mb-10"><h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Package className="w-6 h-6 text-cyan-400" /> {page==='search'?`نتائج البحث: "${searchQuery}"`:'جميع المنتجات'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{(page==='search'?filtered:products).map(p => <ProductCard key={p.id} product={p} onView={id => navigate('product',id)} onAddToCart={addToCart} formatPrice={formatPrice} />)}</div>
        {products.length === 0 && <div className="text-center py-16 text-gray-500"><Package className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>لا توجد منتجات بعد</p></div>}</section>
      <ReviewsCarousel reviews={approvedReviews} />
      {faqs.length > 0 && <section className="mb-10"><h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><HelpCircle className="w-6 h-6 text-purple-400" /> الأسئلة الشائعة</h2>
        <Accordion type="single" collapsible className="space-y-2">{faqs.map(f => <AccordionItem key={f.id} value={f.id} className="bg-[#12121f] border border-purple-500/10 rounded-lg px-4">
          <AccordionTrigger className="text-right hover:text-purple-400">{f.question}</AccordionTrigger><AccordionContent className="text-gray-400">{f.answer}</AccordionContent>
        </AccordionItem>)}</Accordion></section>}
      {(settings.contactEmail||settings.whatsapp||settings.discord||settings.telegram) && <section className="mb-10"><h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Mail className="w-6 h-6 text-cyan-400" /> تواصل معنا</h2>
        <Card className="bg-[#12121f] border-purple-500/10 p-6"><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`} className="flex items-center gap-3 text-gray-300 hover:text-purple-400"><Mail className="w-5 h-5 text-purple-400" />{settings.contactEmail}</a>}
          {settings.whatsapp && <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-green-400 hover:text-green-300"><MessageCircle className="w-5 h-5" /> واتساب</a>}
          {settings.discord && <a href={settings.discord} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-indigo-400"><Gamepad2 className="w-5 h-5" /> ديسكورد</a>}
          {settings.telegram && <a href={`https://t.me/${settings.telegram}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-blue-400"><Send className="w-5 h-5" /> تليجرام</a>}
        </div></Card></section>}
    </div>);
  };

  const CategoryPage = () => {
    const cat = categories.find(c => c.id === pageId);
    const cp = products.filter(p => p.categoryId === pageId);
    return (<div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6"><button onClick={() => navigate('home')} className="text-gray-400 hover:text-purple-400">الرئيسية</button><ChevronLeft className="w-4 h-4 text-gray-600" /><span className="text-purple-400">{cat?.name}</span></div>
      <h1 className="text-3xl font-bold mb-8 neon-text">{cat?.name}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{cp.map(p => <ProductCard key={p.id} product={p} onView={id => navigate('product',id)} onAddToCart={addToCart} formatPrice={formatPrice} />)}</div>
      {cp.length === 0 && <div className="text-center py-16 text-gray-500"><Package className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>لا توجد منتجات</p></div>}
    </div>);
  };

  const ProductDetail = () => {
    const [product, setProduct] = useState(null); const [pL, setPL] = useState(true);
    const [rr, setRR] = useState(5); const [rc, setRC] = useState('');
    useEffect(() => { if (!pageId) return; setPL(true); api(`/products/${pageId}`).then(setProduct).catch(()=>{}).finally(() => setPL(false)); }, []);
    const submitReview = async () => {
      if (!user) { toast.error('يجب تسجيل الدخول'); navigate('login'); return; }
      try { await api('/reviews',{method:'POST',body:JSON.stringify({productId:pageId,rating:rr,comment:rc})},token); toast.success('تم إرسال التقييم - سيظهر بعد موافقة الإدارة'); setRC(''); const u = await api(`/products/${pageId}`); setProduct(u); } catch(e) { toast.error(e.message); }
    };
    if (pL) return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;
    if (!product) return <div className="text-center py-16 text-gray-500">المنتج غير موجود</div>;
    const fp = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price;
    return (<div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button onClick={() => navigate('home')} className="text-gray-400 hover:text-purple-400">الرئيسية</button><ChevronLeft className="w-4 h-4 text-gray-600" />
        {product.categoryName && <><button onClick={() => navigate('category',product.categoryId)} className="text-gray-400 hover:text-purple-400">{product.categoryName}</button><ChevronLeft className="w-4 h-4 text-gray-600" /></>}
        <span className="text-purple-400">{product.name}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="relative rounded-xl overflow-hidden h-[300px] md:h-[400px]">
          {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-cyan-900/30 flex items-center justify-center"><Gamepad2 className="w-24 h-24 text-purple-500/30" /></div>}
          {product.discount > 0 && <Badge className="absolute top-4 left-4 bg-red-500 text-white text-lg px-4 py-1 border-0">خصم {product.discount}%</Badge>}
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <div className="flex items-center gap-3 mb-4"><StarRating rating={Math.round(product.avgRating || 0)} size="md" /><span className="text-gray-400">({product.reviewCount || 0} تقييم)</span></div>
          <div className="flex items-center gap-4 mb-6"><span className="text-4xl font-black text-purple-400">{formatPrice(fp)}</span>{product.discount > 0 && <span className="text-xl text-gray-500 line-through">{formatPrice(product.price)}</span>}</div>
          {product.description && <p className="text-gray-400 mb-6 leading-relaxed">{product.description}</p>}
          <Badge className={product.stock > 0 ? 'bg-green-500/20 text-green-400 border-green-500/30 mb-6' : 'bg-orange-500/20 text-orange-400 border-orange-500/30 mb-6'}>{product.stock > 0 ? `${product.stock} متوفر` : 'غير متوفر - سيتم التسليم يدوياً'}</Badge>
          <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-500 text-lg py-6 neon-glow" onClick={() => addToCart(product)}><ShoppingCart className="w-5 h-5 ml-2" /> أضف إلى السلة</Button>
        </div>
      </div>
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Star className="w-6 h-6 text-yellow-400" /> التقييمات</h2>
        {user && <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
          <h3 className="font-bold mb-3">أضف تقييمك (يتطلب شراء المنتج)</h3>
          <div className="flex items-center gap-3 mb-3"><span className="text-sm text-gray-400">التقييم:</span><StarRating rating={rr} onRate={setRR} size="md" /></div>
          <Textarea placeholder="اكتب تعليقك..." value={rc} onChange={e => setRC(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mb-3" />
          <Button className="bg-purple-600 hover:bg-purple-500" onClick={submitReview}>إرسال التقييم</Button>
        </Card>}
        <div className="space-y-4">{product.reviews?.map(r => <Card key={r.id} className="bg-[#12121f] border-purple-500/10 p-4">
          <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">{r.userName?.charAt(0)}</div><span className="font-medium">{r.userName}</span></div><StarRating rating={r.rating} /></div>
          {r.comment && <p className="text-gray-400 text-sm">{r.comment}</p>}
        </Card>)}</div>
      </section>
    </div>);
  };

  const CartPage = () => (<div className="animate-fade-in max-w-3xl mx-auto">
    <h1 className="text-3xl font-bold mb-8 flex items-center gap-2"><ShoppingCart className="w-8 h-8 text-purple-400" /> سلة المشتريات</h1>
    {cart.length === 0 ? <div className="text-center py-16"><ShoppingCart className="w-20 h-20 text-gray-700 mx-auto mb-4" /><p className="text-gray-500 text-lg mb-4">السلة فارغة</p><Button className="bg-purple-600 hover:bg-purple-500" onClick={() => navigate('home')}>تصفح المنتجات</Button></div>
    : <><div className="space-y-4 mb-6">{cart.map(i => <Card key={i.productId} className="bg-[#12121f] border-purple-500/10 p-4"><div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">{i.image ? <img src={i.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-purple-900/30 flex items-center justify-center"><Gamepad2 className="w-8 h-8 text-purple-500/50" /></div>}</div>
      <div className="flex-1"><h3 className="font-bold mb-1">{i.name}</h3><p className="text-purple-400 font-bold">{formatPrice(i.price)}</p></div>
      <div className="flex items-center gap-2"><Button size="icon" variant="outline" className="w-8 h-8 border-purple-500/30" onClick={() => updateCartQty(i.productId,i.quantity-1)}><Minus className="w-3 h-3" /></Button><span className="w-8 text-center font-bold">{i.quantity}</span><Button size="icon" variant="outline" className="w-8 h-8 border-purple-500/30" onClick={() => updateCartQty(i.productId,i.quantity+1)}><Plus className="w-3 h-3" /></Button></div>
      <span className="font-bold text-lg min-w-[100px] text-left">{formatPrice(i.price*i.quantity)}</span>
      <Button size="icon" variant="ghost" className="text-red-400" onClick={() => updateCartQty(i.productId,0)}><Trash2 className="w-4 h-4" /></Button>
    </div></Card>)}</div>
    <Card className="bg-[#12121f] border-purple-500/20 p-6"><div className="flex justify-between items-center mb-4"><span className="text-lg text-gray-400">المجموع:</span><span className="text-3xl font-black text-purple-400">{formatPrice(cartTotal)}</span></div>
    <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-500 text-lg py-6 neon-glow" onClick={() => { if (!user) { toast.error('يجب تسجيل الدخول'); navigate('login'); } else navigate('checkout'); }}>إتمام الشراء</Button></Card></>}
  </div>);

  const CheckoutPage = () => {
    const [dc, setDC] = useState(''); const [di, setDI] = useState(null); const [proc, setProc] = useState(false);
    const [phoneCode, setPhoneCode] = useState('+966'); const [phoneNum, setPhoneNum] = useState('');
    const validateD = async () => { try { const d = await api('/discounts/validate',{method:'POST',body:JSON.stringify({code:dc})}); setDI(d); toast.success('تم تطبيق الكود'); } catch(e) { toast.error(e.message); setDI(null); } };
    let da = 0; if (di) da = di.type === 'percentage' ? cartTotal*(di.value/100) : Math.min(di.value,cartTotal);
    const ft = Math.max(0, cartTotal - da); // Final total, ensure not negative
    const isFreeOrder = ft === 0 || ft < 0.01; // Check if order is free
    
    const placeOrder = async () => {
      if (!phoneNum.trim()) { toast.error('يرجى إدخال رقم الواتساب'); return; }
      setProc(true);
      try {
        const items = cart.map(i => ({productId:i.productId,quantity:i.quantity}));
        const order = await api('/orders',{method:'POST',body:JSON.stringify({items,discountCode:di?dc:undefined,whatsAppNumber:phoneNum,countryCode:phoneCode,isFree:isFreeOrder})},token);
        
        if (isFreeOrder) {
          // Free order - complete immediately without PayPal
          try {
            await api(`/orders/${order.id}`,{method:'PUT',body:JSON.stringify({status:'completed'})},token);
            setCart([]); 
            localStorage.removeItem('cart'); 
            toast.success('🎉 تم إتمام الطلب المجاني بنجاح!'); 
            navigate('order',order.id);
          } catch(e) {
            toast.error('خطأ في إتمام الطلب: ' + e.message);
          }
          setProc(false);
        } else {
          // Paid order - redirect to PayPal
          try {
            const paypalData = await api('/paypal/create-order',{method:'POST',body:JSON.stringify({orderId:order.id, currency})},token);
            if (paypalData.approveUrl) {
              window.location.href = paypalData.approveUrl;
            } else {
              toast.error('فشل إنشاء طلب PayPal');
              setProc(false);
            }
          } catch(paypalErr) {
            if (paypalErr.message.includes('PayPal غير مكون')) {
              toast.error('PayPal غير مكون. يرجى التواصل مع الإدارة.');
            } else {
              toast.error('خطأ في PayPal: ' + paypalErr.message);
            }
            setProc(false);
          }
        }
      } catch(e) { toast.error(e.message); setProc(false); }
    };
    return (<div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2"><CheckCircle className="w-8 h-8 text-purple-400" /> إتمام الشراء</h1>
      <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
        <h2 className="font-bold text-lg mb-4">ملخص الطلب</h2>
        {cart.map(i => <div key={i.productId} className="flex justify-between py-2 border-b border-gray-800"><span>{i.name} x {i.quantity}</span><span className="text-purple-400">{formatPrice(i.price*i.quantity)}</span></div>)}
        <div className="flex justify-between py-2 mt-2"><span>المجموع</span><span>{formatPrice(cartTotal)}</span></div>
        {da > 0 && <div className="flex justify-between py-2 text-green-400"><span>الخصم</span><span>-{formatPrice(da)}</span></div>}
        <Separator className="my-2 bg-purple-500/20" />
        <div className="flex justify-between py-2 text-xl font-bold"><span>الإجمالي</span><span className="text-purple-400">{formatPrice(ft)}</span></div>
      </Card>
      <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
        <h2 className="font-bold mb-3">رقم الواتساب للتواصل</h2>
        <div className="flex gap-2">
          <Select value={phoneCode} onValueChange={setPhoneCode}>
            <SelectTrigger className="w-[140px] bg-[#0a0a15] border-purple-500/20"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#12121f] border-purple-500/20 max-h-60">{COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="5XXXXXXXX" value={phoneNum} onChange={e => setPhoneNum(e.target.value)} className="bg-[#0a0a15] border-purple-500/20" dir="ltr" />
        </div>
      </Card>
      <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
        <h2 className="font-bold mb-3">كود خصم</h2>
        <div className="flex gap-2"><Input placeholder="أدخل كود الخصم" value={dc} onChange={e => setDC(e.target.value)} className="bg-[#0a0a15] border-purple-500/20" /><Button className="bg-purple-600 hover:bg-purple-500" onClick={validateD}>تطبيق</Button></div>
        {di && <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">خصم {di.type==='percentage'?`${di.value}%`:formatPrice(di.value)} مطبق</Badge>}
      </Card>
      {isFreeOrder && (
        <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="font-bold text-green-400 text-lg">طلب مجاني! 🎉</h3>
              <p className="text-sm text-green-300/80">تم تطبيق خصم 100% - لا حاجة للدفع، سيتم تسليم الطلب مباشرة</p>
            </div>
          </div>
        </Card>
      )}
      {!isFreeOrder && (
        <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6">
          <h2 className="font-bold mb-3 flex items-center gap-2"><DollarSign className="w-5 h-5 text-purple-400" /> طريقة الدفع</h2>
          <div className="p-4 rounded-lg border-2 border-purple-500 bg-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path fill="#003087" d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.658A.641.641 0 0 1 5.577 2h8.326c3.338 0 5.461 2.028 5.461 5.207 0 4.141-2.898 6.794-7.088 6.794h-1.783l-1.082 5.596a.641.641 0 0 1-.633.54z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">PayPal أو بطاقة بنكية</div>
                <div className="text-sm text-gray-400 mt-1">ادفع عبر PayPal أو بطاقة بنكية (Visa, Mastercard) - آمن ومشفر 🔒</div>
              </div>
              <Check className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>
      )}
      <Button size="lg" className={`w-full text-lg py-6 neon-glow ${isFreeOrder ? 'bg-green-600 hover:bg-green-500' : 'bg-purple-600 hover:bg-purple-500'}`} onClick={placeOrder} disabled={proc}>
        {proc ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : (isFreeOrder ? <CheckCircle className="w-5 h-5 ml-2" /> : <DollarSign className="w-5 h-5 ml-2" />)}
        {proc ? (isFreeOrder ? 'جاري إتمام الطلب المجاني...' : 'جاري التوجيه إلى PayPal...') : (isFreeOrder ? '✨ إتمام الطلب المجاني' : '💳 الدفع عبر PayPal / بطاقة بنكية')}
      </Button>
    </div>);
  };

  const OrdersPage = () => {
    const [orders, setOrders] = useState([]); const [oL, setOL] = useState(true);
    useEffect(() => { api('/orders',{},token).then(setOrders).catch(()=>{}).finally(() => setOL(false)); }, []);
    if (oL) return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;
    const sl = { completed:'مكتمل', pending_delivery:'بانتظار التسليم', delivered:'تم التسليم', cancelled:'ملغي' };
    const ss = { completed:'bg-green-500/20 text-green-400', pending_delivery:'bg-orange-500/20 text-orange-400', delivered:'bg-blue-500/20 text-blue-400' };
    return (<div className="animate-fade-in"><h1 className="text-3xl font-bold mb-8 flex items-center gap-2"><Package className="w-8 h-8 text-purple-400" /> طلباتي</h1>
      {orders.length===0 ? <div className="text-center py-16 text-gray-500"><Package className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>لا توجد طلبات</p></div>
      : <div className="space-y-4">{orders.map(o => <Card key={o.id} className="bg-[#12121f] border-purple-500/10 p-6 cursor-pointer hover:border-purple-500/30" onClick={() => navigate('order',o.id)}>
        <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><span className="text-gray-400 text-sm">#{o.id?.slice(0,8)}</span><Badge className={ss[o.status]||''}>{sl[o.status]||o.status}</Badge></div><span className="font-bold text-purple-400">{formatPrice(o.total)}</span></div>
        <div className="text-sm text-gray-400">{o.items?.map(i => i.productName).join(' - ')}</div><div className="text-xs text-gray-600 mt-2">{new Date(o.createdAt).toLocaleString('ar')}</div>
      </Card>)}</div>}</div>);
  };

  const OrderDetail = () => {
    const [order, setOrder] = useState(null); const [oL, setOL] = useState(true);
    useEffect(() => { if (pageId) api(`/orders/${pageId}`,{},token).then(setOrder).catch(()=>{}).finally(() => setOL(false)); }, []);
    if (oL) return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;
    if (!order) return <div className="text-center py-16 text-gray-500">الطلب غير موجود</div>;
    return (<div className="animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">تفاصيل الطلب #{order.id?.slice(0,8)}</h1>
      <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6"><div className="grid grid-cols-2 gap-4">
        <div><span className="text-gray-400 text-sm">الحالة</span><div className="mt-1"><Badge className={order.status==='completed'?'bg-green-500/20 text-green-400':order.status==='pending_delivery'?'bg-orange-500/20 text-orange-400':'bg-blue-500/20 text-blue-400'}>{order.status==='completed'?'مكتمل':order.status==='pending_delivery'?'بانتظار التسليم':'تم التسليم'}</Badge></div></div>
        <div><span className="text-gray-400 text-sm">التاريخ</span><p>{new Date(order.createdAt).toLocaleString('ar')}</p></div>
        <div><span className="text-gray-400 text-sm">الإجمالي</span><p className="text-2xl font-bold text-purple-400">{formatPrice(order.total)}</p></div>
      </div></Card>
      <div className="space-y-4">{order.items?.map((item, idx) => <Card key={idx} className="bg-[#12121f] border-purple-500/10 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">{item.productImage ? <img src={item.productImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-purple-900/30 flex items-center justify-center"><Gamepad2 className="w-6 h-6 text-purple-500/50" /></div>}</div>
          <div className="flex-1"><h3 className="font-bold">{item.productName}</h3><p className="text-sm text-gray-400">{formatPrice(item.price)} x {item.quantity}</p></div>
        </div>
        {item.deliveredCodes?.length > 0 && <div className="bg-[#0a0a15] rounded-lg p-4 mb-2"><h4 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-1"><Key className="w-4 h-4" /> الأكواد المسلمة:</h4>
          {item.deliveredCodes.map((c, ci) => <div key={ci} className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0"><code className="text-cyan-400 font-mono text-sm">{c}</code><Button size="sm" variant="ghost" className="text-gray-400 hover:text-purple-400 h-7" onClick={() => {navigator.clipboard.writeText(c);toast.success('تم نسخ الكود');}}><Copy className="w-3 h-3" /></Button></div>)}
        </div>}
        {item.pendingCount > 0 && <div className="bg-orange-500/10 rounded-lg p-3 text-orange-400 text-sm flex items-center gap-2"><Clock className="w-4 h-4" />{item.pendingCount} كود بانتظار التسليم</div>}
      </Card>)}</div>
    </div>);
  };

  const ProfilePage = () => {
    const [name, setName] = useState(user?.name||''); const [email, setEmail] = useState(user?.email||'');
    const [phone, setPhone] = useState(user?.phone||''); const [cc, setCC] = useState(user?.countryCode||'+966');
    const [curPw, setCurPw] = useState(''); const [newPw, setNewPw] = useState(''); const [busy, setBusy] = useState(false);
    const saveProfile = async () => { setBusy(true); try { const d = await api('/auth/profile',{method:'PUT',body:JSON.stringify({name,email,phone,countryCode:cc})},token); setUser(d.user); toast.success('تم حفظ البيانات'); } catch(e) { toast.error(e.message); } finally { setBusy(false); } };
    const changePw = async () => { if (!curPw||!newPw) return toast.error('جميع الحقول مطلوبة'); setBusy(true); try { await api('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:curPw,newPassword:newPw})},token); toast.success('تم تغيير كلمة المرور'); setCurPw(''); setNewPw(''); } catch(e) { toast.error(e.message); } finally { setBusy(false); } };
    return (<div className="animate-fade-in max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2"><UserCog className="w-8 h-8 text-purple-400" /> الملف الشخصي</h1>
      <Card className="bg-[#12121f] border-purple-500/10 p-6 mb-6"><h2 className="font-bold mb-4">البيانات الشخصية</h2>
        <div className="space-y-4">
          <div><Label>الاسم</Label><Input value={name} onChange={e => setName(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <div><Label>البريد الإلكتروني</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <div><Label>رقم الهاتف</Label><div className="flex gap-2 mt-1">
            <Select value={cc} onValueChange={setCC}><SelectTrigger className="w-[130px] bg-[#0a0a15] border-purple-500/20"><SelectValue /></SelectTrigger><SelectContent className="bg-[#12121f] border-purple-500/20 max-h-60">{COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}</SelectContent></Select>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-[#0a0a15] border-purple-500/20" dir="ltr" />
          </div></div>
          <Button className="bg-purple-600 hover:bg-purple-500" onClick={saveProfile} disabled={busy}>{busy?<Loader2 className="w-4 h-4 animate-spin ml-1" />:null}حفظ</Button>
        </div>
      </Card>
      <Card className="bg-[#12121f] border-purple-500/10 p-6"><h2 className="font-bold mb-4 flex items-center gap-2"><Lock className="w-5 h-5" /> تغيير كلمة المرور</h2>
        <div className="space-y-4">
          <div><Label>كلمة المرور الحالية</Label><Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <div><Label>كلمة المرور الجديدة</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <Button className="bg-purple-600 hover:bg-purple-500" onClick={changePw} disabled={busy}>تغيير</Button>
        </div>
      </Card>
    </div>);
  };

  const LoginPage = () => {
    const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
    const [isReg, setIsReg] = useState(page==='register'); const [name, setName] = useState('');
    const [busy, setBusy] = useState(false); const [showForgot, setShowForgot] = useState(false); const [forgotEmail, setForgotEmail] = useState('');
    const handleSubmit = async (e) => { e.preventDefault(); setBusy(true); try { if (isReg) await handleRegister(name,email,pw); else await handleLogin(email,pw); } catch(e) { toast.error(e.message); } finally { setBusy(false); } };
    const handleForgot = async () => { if (!forgotEmail) return; setBusy(true); try { await api('/auth/forgot-password',{method:'POST',body:JSON.stringify({email:forgotEmail})}); toast.success('تم إرسال رابط إعادة التعيين إلى بريدك'); setShowForgot(false); } catch(e) { toast.error(e.message); } finally { setBusy(false); } };
    const handleGoogleLogin = () => {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = window.location.origin;
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };
    return (<div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
      <Card className="bg-[#12121f] border-purple-500/20 w-full max-w-md p-8 neon-glow">
        <div className="text-center mb-8">{settings.logo ? <img src={settings.logo} alt="" className="h-12 mx-auto mb-3" /> : <Zap className="w-12 h-12 text-purple-400 mx-auto mb-3" />}<h1 className="text-2xl font-bold">{isReg?'إنشاء حساب':'تسجيل الدخول'}</h1></div>
        <Button type="button" className="w-full bg-white hover:bg-gray-100 text-black font-medium py-5 mb-4 flex items-center justify-center gap-2" onClick={handleGoogleLogin}>
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          تسجيل الدخول عبر Google
        </Button>
        <div className="relative my-4"><div className="absolute inset-0 flex items-center"><Separator className="bg-purple-500/20" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-[#12121f] px-2 text-gray-400">أو</span></div></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isReg && <div><Label>الاسم</Label><Input value={name} onChange={e => setName(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required /></div>}
          <div><Label>البريد الإلكتروني</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required /></div>
          <div><Label>كلمة المرور</Label><Input type="password" value={pw} onChange={e => setPw(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required /></div>
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 py-5" disabled={busy}>{busy?<Loader2 className="w-4 h-4 animate-spin ml-2" />:null}{isReg?'إنشاء حساب':'دخول'}</Button>
        </form>
        {!isReg && <button className="text-sm text-purple-400 hover:underline mt-3 block text-center w-full" onClick={() => setShowForgot(true)}>نسيت كلمة المرور؟</button>}
        <p className="text-center mt-4 text-sm text-gray-400">{isReg?'لديك حساب؟':'ليس لديك حساب؟'} <button className="text-purple-400 hover:underline" onClick={() => setIsReg(!isReg)}>{isReg?'تسجيل الدخول':'إنشاء حساب جديد'}</button></p>
      </Card>
      <Dialog open={showForgot} onOpenChange={setShowForgot}><DialogContent className="bg-[#12121f] border-purple-500/20">
        <DialogHeader><DialogTitle>نسيت كلمة المرور</DialogTitle></DialogHeader>
        <div><Label>البريد الإلكتروني</Label><Input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
        <DialogFooter><Button className="bg-purple-600 hover:bg-purple-500" onClick={handleForgot} disabled={busy}>إرسال رابط التعيين</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>);
  };

  const ResetPasswordPage = () => {
    const [newPw, setNewPw] = useState(''); const [busy, setBusy] = useState(false);
    const handleReset = async () => { if (!newPw) return; setBusy(true); try { await api('/auth/reset-password',{method:'POST',body:JSON.stringify({token:pageId,newPassword:newPw})}); toast.success('تم تغيير كلمة المرور'); window.history.replaceState({}, '', window.location.pathname); navigate('login'); } catch(e) { toast.error(e.message); } finally { setBusy(false); } };
    return (<div className="min-h-[60vh] flex items-center justify-center animate-fade-in"><Card className="bg-[#12121f] border-purple-500/20 w-full max-w-md p-8 neon-glow">
      <div className="text-center mb-8"><Lock className="w-12 h-12 text-purple-400 mx-auto mb-3" /><h1 className="text-2xl font-bold">إعادة تعيين كلمة المرور</h1></div>
      <div className="space-y-4"><div><Label>كلمة المرور الجديدة</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
      <Button className="w-full bg-purple-600 hover:bg-purple-500 py-5" onClick={handleReset} disabled={busy}>{busy?<Loader2 className="w-4 h-4 animate-spin ml-2" />:null}تعيين كلمة المرور</Button></div>
    </Card></div>);
  };

  // ============ ADMIN PANEL ============
  const AdminPanel = () => {
    const [tab, setTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [allCats, setAllCats] = useState([]); const [allProds, setAllProds] = useState([]);
    const [allOrders, setAllOrders] = useState([]); const [allUsers, setAllUsers] = useState([]);
    const [allDisc, setAllDisc] = useState([]); const [allSliders, setAllSliders] = useState([]);
    const [allFaqs, setAllFaqs] = useState([]); const [aSettings, setASettings] = useState({});
    const [allReviews, setAllReviews] = useState([]);
    const [codes, setCodes] = useState([]); const [selProd, setSelProd] = useState(null);
    const [showDlg, setShowDlg] = useState(false); const [editItem, setEditItem] = useState(null);
    const [fd, setFD] = useState({}); const [dlgType, setDlgType] = useState('');
    const [showDeliver, setShowDeliver] = useState(false); const [delOrder, setDelOrder] = useState(null);
    const [delIdx, setDelIdx] = useState(0); const [delCodes, setDelCodes] = useState('');

    const load = useCallback(async (t) => {
      try {
        if (t==='dashboard') setStats(await api('/stats',{},token));
        if (t==='categories') setAllCats(await api('/categories/all',{},token));
        if (t==='products') { setAllProds(await api('/products?all=true',{},token)); setAllCats(await api('/categories/all',{},token)); }
        if (t==='codes') setAllProds(await api('/products?all=true',{},token));
        if (t==='orders') setAllOrders(await api('/orders',{},token));
        if (t==='users') setAllUsers(await api('/users',{},token));
        if (t==='discounts') setAllDisc(await api('/discounts',{},token));
        if (t==='sliders') setAllSliders(await api('/sliders?all=true',{},token));
        if (t==='faqs') setAllFaqs(await api('/faqs',{},token));
        if (t==='settings') setASettings(await api('/settings',{},token));
        if (t==='reviews') setAllReviews(await api('/reviews?all=true',{},token));
      } catch(e) { console.error(e); }
    }, [token]);
    useEffect(() => { load(tab); }, [tab, load]);

    const openForm = (type, item=null) => { setDlgType(type); setEditItem(item); setFD(item||{}); setShowDlg(true); };
    const saveForm = async () => {
      try {
        const isE = !!editItem?.id; let url = '';
        switch(dlgType) {
          case 'category': url=isE?`/categories/${editItem.id}`:'/categories'; break;
          case 'product': url=isE?`/products/${editItem.id}`:'/products'; break;
          case 'discount': url=isE?`/discounts/${editItem.id}`:'/discounts'; break;
          case 'slider': url=isE?`/sliders/${editItem.id}`:'/sliders'; break;
          case 'faq': url=isE?`/faqs/${editItem.id}`:'/faqs'; break;
        }
        await api(url,{method:isE?'PUT':'POST',body:JSON.stringify(fd)},token);
        toast.success(isE?'تم التعديل':'تمت الإضافة'); setShowDlg(false); load(tab); refreshData();
      } catch(e) { toast.error(e.message); }
    };
    const deleteItem = async (type, id) => { if (!confirm('حذف؟')) return; const u = {category:'/categories',product:'/products',discount:'/discounts',slider:'/sliders',faq:'/faqs',code:'/codes'}; await api(`${u[type]}/${id}`,{method:'DELETE'},token); toast.success('تم الحذف'); load(tab); refreshData(); };
    const loadCodes = async (pid) => { setSelProd(pid); setCodes(await api(`/codes?productId=${pid}`,{},token)); };
    const addCodes = async (pid, txt) => { const cl=txt.split('\n').filter(c=>c.trim()); await api('/codes',{method:'POST',body:JSON.stringify({productId:pid,codes:cl})},token); toast.success(`تمت إضافة ${cl.length} كود`); loadCodes(pid); };
    const handleDeliver = async () => { try { const cl=delCodes.split('\n').filter(c=>c.trim()); await api(`/orders/${delOrder.id}`,{method:'PUT',body:JSON.stringify({action:'deliver',itemIndex:delIdx,codes:cl})},token); toast.success('تم التسليم'); setShowDeliver(false); load('orders'); } catch(e) { toast.error(e.message); } };
    const saveSettings = async () => { try { const u = await api('/settings',{method:'PUT',body:JSON.stringify(aSettings)},token); setSettings(u); toast.success('تم حفظ الإعدادات'); } catch(e) { toast.error(e.message); } };
    const approveReview = async (id, approved) => { await api(`/reviews/${id}`,{method:'PUT',body:JSON.stringify({approved})},token); toast.success(approved?'تم القبول':'تم الرفض'); load('reviews'); refreshData(); };

    const sideItems = [
      {id:'dashboard',label:'لوحة المعلومات',icon:BarChart3},{id:'products',label:'المنتجات',icon:Package},
      {id:'categories',label:'الأقسام',icon:FolderOpen},{id:'codes',label:'المخزون',icon:Key},
      {id:'orders',label:'الطلبات',icon:ShoppingCart},{id:'users',label:'المستخدمين',icon:Users},
      {id:'reviews',label:'التقييمات',icon:MessageSquare},{id:'discounts',label:'أكواد الخصم',icon:Tag},
      {id:'sliders',label:'السلايدر',icon:ImageIcon},{id:'faqs',label:'الأسئلة الشائعة',icon:HelpCircle},
      {id:'settings',label:'الإعدادات',icon:Settings},
    ];

    return (<div className="min-h-screen flex">
      <aside className="w-64 bg-[#0a0a15] border-l border-purple-500/20 p-4 hidden lg:block fixed h-full overflow-auto">
        <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('home')}>
          {settings.logo ? <img src={settings.logo} alt="" className="h-8" /> : <Zap className="w-8 h-8 text-purple-400" />}
          <span className="font-bold text-lg neon-text">{settings.siteName}</span>
        </div>
        <nav className="space-y-1">{sideItems.map(i => <button key={i.id} onClick={() => setTab(i.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${tab===i.id?'bg-purple-600/20 text-purple-400':'text-gray-400 hover:bg-purple-500/10 hover:text-white'}`}><i.icon className="w-5 h-5" />{i.label}
          {i.id==='reviews'&&stats?.pendingReviews>0&&<Badge className="bg-red-500 text-white text-xs mr-auto">{stats.pendingReviews}</Badge>}
          {i.id==='orders'&&stats?.pendingOrders>0&&<Badge className="bg-orange-500 text-white text-xs mr-auto">{stats.pendingOrders}</Badge>}
        </button>)}</nav>
        <Separator className="my-4 bg-purple-500/20" />
        <button onClick={() => navigate('home')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-400 hover:text-white"><Home className="w-5 h-5" /> المتجر</button>
      </aside>

      <div className="lg:hidden p-4 border-b border-purple-500/20 w-full">
        <div className="flex items-center justify-between mb-3"><span className="font-bold text-purple-400">لوحة التحكم</span><Button size="sm" variant="ghost" onClick={() => navigate('home')}><Home className="w-4 h-4 ml-1" /> المتجر</Button></div>
        <div className="flex flex-wrap gap-2">{sideItems.map(i => <Button key={i.id} size="sm" variant={tab===i.id?'default':'outline'} className={tab===i.id?'bg-purple-600':'border-purple-500/30'} onClick={() => setTab(i.id)}><i.icon className="w-3 h-3 ml-1" /><span className="text-xs">{i.label}</span></Button>)}</div>
      </div>

      <main className="flex-1 p-6 overflow-auto lg:mr-64">
        {/* Dashboard */}
        {tab==='dashboard'&&stats&&<div className="animate-fade-in"><h2 className="text-2xl font-bold mb-6">لوحة المعلومات</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">{[
            {l:'الإيرادات',v:`$${stats.totalRevenue?.toFixed(2)}`,icon:DollarSign,c:'text-green-400'},{l:'الطلبات',v:stats.totalOrders,icon:ShoppingCart,c:'text-blue-400'},
            {l:'المستخدمين',v:stats.totalUsers,icon:Users,c:'text-purple-400'},{l:'بانتظار التسليم',v:stats.pendingOrders,icon:Clock,c:'text-orange-400'},
            {l:'أكواد متوفرة',v:stats.availableCodes,icon:Key,c:'text-green-400'},{l:'أكواد مباعة',v:stats.soldCodes,icon:Check,c:'text-purple-400'},
            {l:'تقييمات بانتظار الموافقة',v:stats.pendingReviews,icon:MessageSquare,c:'text-yellow-400'},{l:'المنتجات',v:stats.totalProducts,icon:Package,c:'text-cyan-400'},
          ].map((s,i) => <Card key={i} className="bg-[#12121f] border-purple-500/10 p-4"><s.icon className={`w-5 h-5 ${s.c} mb-2`} /><p className="text-2xl font-bold">{s.v}</p><p className="text-sm text-gray-400">{s.l}</p></Card>)}</div>
          <h3 className="font-bold mb-4">آخر الطلبات</h3><div className="space-y-2">{stats.recentOrders?.map(o => <Card key={o.id} className="bg-[#12121f] border-purple-500/10 p-3 flex items-center justify-between"><div className="flex items-center gap-3 flex-wrap"><span className="text-sm text-gray-400">#{o.id?.slice(0,8)}</span><span className="text-sm">{o.userName}</span>
            {o.phone && <a href={`https://wa.me/${o.countryCode?.replace('+','')}${o.phone}`} target="_blank" rel="noreferrer" className="text-green-400 text-xs flex items-center gap-1"><MessageCircle className="w-3 h-3" />{o.countryCode}{o.phone}</a>}
          </div><div className="flex items-center gap-3"><Badge className={o.status==='completed'?'bg-green-500/20 text-green-400':'bg-orange-500/20 text-orange-400'}>{o.status==='completed'?'مكتمل':'بانتظار'}</Badge><span className="font-bold text-purple-400">${o.total?.toFixed(2)}</span></div></Card>)}</div>
        </div>}

        {/* Reviews Approval */}
        {tab==='reviews'&&<div className="animate-fade-in"><h2 className="text-2xl font-bold mb-6">إدارة التقييمات</h2>
          <div className="space-y-2">{allReviews.map(r => <Card key={r.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
            <div className="flex-1"><div className="flex items-center gap-3 mb-1"><span className="font-medium">{r.userName}</span><StarRating rating={r.rating} />
              <Badge className={r.approved?'bg-green-500/20 text-green-400':'bg-yellow-500/20 text-yellow-400'}>{r.approved?'مقبول':'بانتظار الموافقة'}</Badge></div>
              {r.comment && <p className="text-sm text-gray-400">{r.comment}</p>}<p className="text-xs text-gray-500 mt-1">{new Date(r.createdAt).toLocaleString('ar')}</p></div>
            <div className="flex gap-2">{!r.approved && <Button size="sm" className="bg-green-600 hover:bg-green-500" onClick={() => approveReview(r.id,true)}><Check className="w-3 h-3 ml-1" /> قبول</Button>}
              {r.approved && <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400" onClick={() => approveReview(r.id,false)}><X className="w-3 h-3 ml-1" /> إلغاء</Button>}
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('review',r.id)}><Trash2 className="w-3 h-3" /></Button></div>
          </Card>)}</div></div>}

        {/* Categories */}
        {tab==='categories'&&<div className="animate-fade-in"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">الأقسام</h2><Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('category')}><Plus className="w-4 h-4 ml-1" /> إضافة</Button></div>
          <div className="space-y-2">{allCats.map(c => <Card key={c.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-lg overflow-hidden bg-purple-900/30">{c.image?<img src={c.image} alt="" className="w-full h-full object-cover" />:<FolderOpen className="w-6 h-6 text-purple-500/50 m-3" />}</div><div><p className="font-bold">{c.name}</p><p className="text-xs text-gray-400">{c.productCount||0} منتج</p></div></div>
            <div className="flex gap-2"><Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('category',c)}><Edit className="w-3 h-3" /></Button><Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('category',c.id)}><Trash2 className="w-3 h-3" /></Button></div>
          </Card>)}</div></div>}

        {/* Products */}
        {tab==='products'&&<div className="animate-fade-in"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">المنتجات</h2><Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('product')}><Plus className="w-4 h-4 ml-1" /> إضافة</Button></div>
          <div className="space-y-2">{allProds.map(p => <Card key={p.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-lg overflow-hidden bg-purple-900/30">{p.image?<img src={p.image} alt="" className="w-full h-full object-cover" />:<Package className="w-6 h-6 text-purple-500/50 m-3" />}</div><div><p className="font-bold">{p.name}</p><p className="text-xs text-gray-400">${p.price?.toFixed(2)} | مخزون: {p.stock||0}</p></div>
              {p.discount>0&&<Badge className="bg-red-500/20 text-red-400">خصم {p.discount}%</Badge>}{p.featured&&<Badge className="bg-yellow-500/20 text-yellow-400">مميز</Badge>}</div>
            <div className="flex gap-2"><Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('product',p)}><Edit className="w-3 h-3" /></Button><Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('product',p.id)}><Trash2 className="w-3 h-3" /></Button></div>
          </Card>)}</div></div>}

        {/* Codes */}
        {tab==='codes'&&<div className="animate-fade-in"><h2 className="text-2xl font-bold mb-6">المخزون</h2><div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div><h3 className="font-bold mb-3">اختر المنتج</h3><div className="space-y-2 max-h-[60vh] overflow-auto">{allProds.map(p => <Card key={p.id} className={`p-3 cursor-pointer ${selProd===p.id?'bg-purple-600/20 border-purple-500/40':'bg-[#12121f] border-purple-500/10 hover:border-purple-500/30'}`} onClick={() => loadCodes(p.id)}><div className="flex justify-between"><span>{p.name}</span><Badge className="bg-purple-500/20 text-purple-400">{p.stock||0}</Badge></div></Card>)}</div></div>
          <div>{selProd&&<div><Card className="bg-[#12121f] border-purple-500/10 p-4 mb-4"><Label>إضافة أكواد (كل كود في سطر)</Label><Textarea id="newcodes" className="bg-[#0a0a15] border-purple-500/20 mt-2 font-mono" rows={5} placeholder="XXXXX-XXXXX" />
            <Button className="bg-purple-600 hover:bg-purple-500 mt-3" onClick={() => { const el=document.getElementById('newcodes'); addCodes(selProd,el.value); el.value=''; }}><Plus className="w-4 h-4 ml-1" /> إضافة</Button></Card>
            <div className="space-y-1 max-h-[40vh] overflow-auto">{codes.map(c => <div key={c.id} className="flex items-center justify-between bg-[#0a0a15] rounded-lg p-3 text-sm"><div className="flex items-center gap-3"><Badge className={c.status==='available'?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}>{c.status==='available'?'متوفر':'مباع'}</Badge><code className="font-mono text-cyan-400">{c.code}</code></div>
              {c.status==='available'&&<Button size="sm" variant="ghost" className="text-red-400 h-7" onClick={() => deleteItem('code',c.id)}><Trash2 className="w-3 h-3" /></Button>}</div>)}</div></div>}</div>
        </div></div>}

        {/* Orders */}
        {tab==='orders'&&<div className="animate-fade-in"><h2 className="text-2xl font-bold mb-6">الطلبات</h2><div className="space-y-2">{allOrders.map(o => <Card key={o.id} className="bg-[#12121f] border-purple-500/10 p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-400">#{o.id?.slice(0,8)}</span>
              <span>{o.userName}</span>
              <span className="text-xs text-gray-500">{o.userEmail}</span>
              {(o.whatsAppNumber || o.phone) && (
                <a 
                  href={`https://wa.me/${(o.countryCode||'').replace('+','')}${o.whatsAppNumber||o.phone}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-lg transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-medium text-sm">{o.countryCode} {o.whatsAppNumber||o.phone}</span>
                  <span className="text-xs text-green-300/70">واتساب</span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge className={o.status==='completed'?'bg-green-500/20 text-green-400':o.status==='pending_delivery'?'bg-orange-500/20 text-orange-400':'bg-blue-500/20 text-blue-400'}>
                {o.status==='completed'?'مكتمل':o.status==='pending_delivery'?'بانتظار التسليم':'تم التسليم'}
              </Badge>
              <span className="font-bold text-purple-400">${o.total?.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-2">{o.items?.map(i => `${i.productName} (${i.quantity})`).join(' | ')}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString('ar')}</span>
            {o.status==='pending_delivery'&&<div className="flex gap-2 flex-wrap">{o.items?.map((item,idx) => item.pendingCount>0&&<Button key={idx} size="sm" className="bg-orange-600 hover:bg-orange-500" onClick={() => {setDelOrder(o);setDelIdx(idx);setDelCodes('');setShowDeliver(true);}}><Truck className="w-3 h-3 ml-1" /> تسليم {item.productName}</Button>)}</div>}
          </div>
        </Card>)}</div></div>}

        {/* Users */}
        {tab==='users'&&<div className="animate-fade-in"><h2 className="text-2xl font-bold mb-6">المستخدمين</h2><div className="space-y-2">{allUsers.map(u => <Card key={u.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold">{u.name?.charAt(0)}</div><div><p className="font-medium">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div>
            <Badge className={u.role==='admin'?'bg-purple-500/20 text-purple-400':'bg-gray-500/20 text-gray-400'}>{u.role==='admin'?'مدير':'مستخدم'}</Badge>{u.banned&&<Badge className="bg-red-500/20 text-red-400">محظور</Badge>}</div>
          <div className="flex gap-2"><Button size="sm" variant="outline" className="border-purple-500/30" onClick={async()=>{await api(`/users/${u.id}`,{method:'PUT',body:JSON.stringify({role:u.role==='admin'?'user':'admin'})},token);toast.success('تم');load('users');}}><Shield className="w-3 h-3 ml-1" />{u.role==='admin'?'إزالة':'جعل مدير'}</Button>
            <Button size="sm" variant="outline" className={u.banned?'border-green-500/30 text-green-400':'border-red-500/30 text-red-400'} onClick={async()=>{await api(`/users/${u.id}`,{method:'PUT',body:JSON.stringify({banned:!u.banned})},token);toast.success('تم');load('users');}}><Ban className="w-3 h-3 ml-1" />{u.banned?'إلغاء الحظر':'حظر'}</Button></div>
        </Card>)}</div></div>}

        {/* Discounts */}
        {tab==='discounts'&&<div className="animate-fade-in"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">أكواد الخصم</h2><Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('discount')}><Plus className="w-4 h-4 ml-1" /> إضافة</Button></div>
          <div className="space-y-2">{allDisc.map(d => <Card key={d.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><code className="text-cyan-400 font-mono font-bold">{d.code}</code><Badge className="bg-purple-500/20 text-purple-400">{d.type==='percentage'?`${d.value}%`:`$${d.value}`}</Badge><span className="text-xs text-gray-400">{d.currentUses}/{d.maxUses||'\u221e'}</span>
              {d.expiresAt && <span className="text-xs text-gray-500">حتى {new Date(d.expiresAt).toLocaleDateString('ar')}</span>}
              <Badge className={d.active?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}>{d.active?'نشط':'غير نشط'}</Badge></div>
            <div className="flex gap-2"><Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('discount',d)}><Edit className="w-3 h-3" /></Button><Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('discount',d.id)}><Trash2 className="w-3 h-3" /></Button></div>
          </Card>)}</div></div>}

        {/* Sliders */}
        {tab==='sliders'&&<div className="animate-fade-in"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">السلايدر</h2><Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('slider')}><Plus className="w-4 h-4 ml-1" /> إضافة</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{allSliders.map(s => <Card key={s.id} className="bg-[#12121f] border-purple-500/10 overflow-hidden">
            <div className="h-40 overflow-hidden">{s.image?<img src={s.image} alt="" className="w-full h-full object-cover" />:<div className="w-full h-full bg-purple-900/30" />}</div>
            <CardContent className="p-3 flex items-center justify-between"><div><p className="font-medium">{s.title||'بدون عنوان'}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('slider',s)}><Edit className="w-3 h-3" /></Button><Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('slider',s.id)}><Trash2 className="w-3 h-3" /></Button></div></CardContent>
          </Card>)}</div></div>}

        {/* FAQs */}
        {tab==='faqs'&&<div className="animate-fade-in"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">الأسئلة الشائعة</h2><Button className="bg-purple-600 hover:bg-purple-500" onClick={() => openForm('faq')}><Plus className="w-4 h-4 ml-1" /> إضافة</Button></div>
          <div className="space-y-2">{allFaqs.map(f => <Card key={f.id} className="bg-[#12121f] border-purple-500/10 p-4 flex items-center justify-between"><div><p className="font-bold">{f.question}</p><p className="text-sm text-gray-400 mt-1 line-clamp-1">{f.answer}</p></div>
            <div className="flex gap-2"><Button size="sm" variant="outline" className="border-purple-500/30" onClick={() => openForm('faq',f)}><Edit className="w-3 h-3" /></Button><Button size="sm" variant="outline" className="border-red-500/30 text-red-400" onClick={() => deleteItem('faq',f.id)}><Trash2 className="w-3 h-3" /></Button></div></Card>)}</div></div>}

        {/* Settings */}
        {tab==='settings'&&<div className="animate-fade-in max-w-2xl"><h2 className="text-2xl font-bold mb-6">الإعدادات</h2><div className="space-y-6">
          <div><Label>اسم الموقع</Label><Input value={aSettings.siteName||''} onChange={e => setASettings({...aSettings,siteName:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <div><Label>شعار الموقع (Logo)</Label><ImageUploader value={aSettings.logo||''} onChange={v => setASettings({...aSettings,logo:v})} token={token} /></div>
          <div><Label>أيقونة علامة التبويب (Favicon)</Label><ImageUploader value={aSettings.favicon||''} onChange={v => setASettings({...aSettings,favicon:v})} token={token} /></div>
          <div><Label>صورة معاينة الرابط (OG Image)</Label><ImageUploader value={aSettings.ogImage||''} onChange={v => setASettings({...aSettings,ogImage:v})} token={token} /></div>
          <Separator className="bg-purple-500/20" />
          <div className="grid grid-cols-2 gap-4">
            <div><Label>اللون الأساسي</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={aSettings.primaryColor||'#8b5cf6'} onChange={e => setASettings({...aSettings,primaryColor:e.target.value})} className="w-10 h-10 rounded cursor-pointer" /><Input value={aSettings.primaryColor||''} onChange={e => setASettings({...aSettings,primaryColor:e.target.value})} className="bg-[#0a0a15] border-purple-500/20" /></div></div>
            <div><Label>اللون الثانوي</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={aSettings.secondaryColor||'#22d3ee'} onChange={e => setASettings({...aSettings,secondaryColor:e.target.value})} className="w-10 h-10 rounded cursor-pointer" /><Input value={aSettings.secondaryColor||''} onChange={e => setASettings({...aSettings,secondaryColor:e.target.value})} className="bg-[#0a0a15] border-purple-500/20" /></div></div>
          </div>
          <Separator className="bg-purple-500/20" /><h3 className="font-bold">وسائل التواصل</h3>
          <div><Label>البريد</Label><Input value={aSettings.contactEmail||''} onChange={e => setASettings({...aSettings,contactEmail:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <div><Label>الهاتف</Label><Input value={aSettings.contactPhone||''} onChange={e => setASettings({...aSettings,contactPhone:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <div><Label>واتساب</Label><Input value={aSettings.whatsapp||''} onChange={e => setASettings({...aSettings,whatsapp:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" placeholder="966XXXXXXXXX" /></div>
          <div><Label>ديسكورد (رابط)</Label><Input value={aSettings.discord||''} onChange={e => setASettings({...aSettings,discord:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <div><Label>تليجرام (اسم المستخدم)</Label><Input value={aSettings.telegram||''} onChange={e => setASettings({...aSettings,telegram:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <Separator className="bg-purple-500/20" />
          <div><Label>نص الفوتر</Label><Input value={aSettings.footerText||''} onChange={e => setASettings({...aSettings,footerText:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
          <Button className="bg-purple-600 hover:bg-purple-500" onClick={saveSettings}>حفظ الإعدادات</Button>
        </div></div>}
      </main>

      {/* Form Dialog */}
      <Dialog open={showDlg} onOpenChange={setShowDlg}><DialogContent className="bg-[#12121f] border-purple-500/20 max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>{editItem?.id?'تعديل':'إضافة'} {dlgType==='category'?'قسم':dlgType==='product'?'منتج':dlgType==='discount'?'كود خصم':dlgType==='slider'?'صورة سلايدر':'سؤال'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {dlgType==='category'&&<><div><Label>الاسم</Label><Input value={fd.name||''} onChange={e => setFD({...fd,name:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div><Label>الصورة</Label><ImageUploader value={fd.image||''} onChange={v => setFD({...fd,image:v})} token={token} /></div><div><Label>الترتيب</Label><Input type="number" value={fd.order||0} onChange={e => setFD({...fd,order:parseInt(e.target.value)})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div className="flex items-center gap-2"><Switch checked={fd.active!==false} onCheckedChange={v => setFD({...fd,active:v})} /><Label>نشط</Label></div></>}
          {dlgType==='product'&&<><div><Label>الاسم</Label><Input value={fd.name||''} onChange={e => setFD({...fd,name:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div><Label>الوصف</Label><Textarea value={fd.description||''} onChange={e => setFD({...fd,description:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>السعر ($)</Label><Input type="number" step="0.01" value={fd.price||''} onChange={e => setFD({...fd,price:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div><Label>الخصم (%)</Label><Input type="number" value={fd.discount||0} onChange={e => setFD({...fd,discount:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div></div>
            <div><Label>القسم</Label><Select value={fd.categoryId||''} onValueChange={v => setFD({...fd,categoryId:v})}><SelectTrigger className="bg-[#0a0a15] border-purple-500/20 mt-1"><SelectValue placeholder="اختر" /></SelectTrigger><SelectContent className="bg-[#12121f] border-purple-500/20">{allCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>الصورة</Label><ImageUploader value={fd.image||''} onChange={v => setFD({...fd,image:v})} token={token} /></div>
            <div className="flex items-center gap-4"><div className="flex items-center gap-2"><Switch checked={fd.active!==false} onCheckedChange={v => setFD({...fd,active:v})} /><Label>نشط</Label></div><div className="flex items-center gap-2"><Switch checked={fd.featured||false} onCheckedChange={v => setFD({...fd,featured:v})} /><Label>مميز</Label></div></div></>}
          {dlgType==='discount'&&<><div><Label>الكود</Label><Input value={fd.code||''} onChange={e => setFD({...fd,code:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
            <div><Label>النوع</Label><Select value={fd.type||'percentage'} onValueChange={v => setFD({...fd,type:v})}><SelectTrigger className="bg-[#0a0a15] border-purple-500/20 mt-1"><SelectValue /></SelectTrigger><SelectContent className="bg-[#12121f] border-purple-500/20"><SelectItem value="percentage">نسبة مئوية</SelectItem><SelectItem value="fixed">مبلغ ثابت</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>القيمة</Label><Input type="number" value={fd.value||''} onChange={e => setFD({...fd,value:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div><Label>الحد الأدنى</Label><Input type="number" value={fd.minOrder||''} onChange={e => setFD({...fd,minOrder:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div></div>
            <div><Label>الحد الأقصى للاستخدام (0=غير محدود)</Label><Input type="number" value={fd.maxUses||''} onChange={e => setFD({...fd,maxUses:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div>
            <div><Label>تاريخ الانتهاء</Label><Input type="datetime-local" value={fd.expiresAt?new Date(fd.expiresAt).toISOString().slice(0,16):''} onChange={e => setFD({...fd,expiresAt:e.target.value?new Date(e.target.value).toISOString():null})} className="bg-[#0a0a15] border-purple-500/20 mt-1" dir="ltr" /></div>
            <div className="flex items-center gap-2"><Switch checked={fd.active!==false} onCheckedChange={v => setFD({...fd,active:v})} /><Label>نشط</Label></div></>}
          {dlgType==='slider'&&<><div><Label>الصورة</Label><ImageUploader value={fd.image||''} onChange={v => setFD({...fd,image:v})} token={token} /></div><div><Label>العنوان</Label><Input value={fd.title||''} onChange={e => setFD({...fd,title:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div><Label>الرابط</Label><Input value={fd.link||''} onChange={e => setFD({...fd,link:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div><Label>الترتيب</Label><Input type="number" value={fd.order||0} onChange={e => setFD({...fd,order:parseInt(e.target.value)})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div className="flex items-center gap-2"><Switch checked={fd.active!==false} onCheckedChange={v => setFD({...fd,active:v})} /><Label>نشط</Label></div></>}
          {dlgType==='faq'&&<><div><Label>السؤال</Label><Input value={fd.question||''} onChange={e => setFD({...fd,question:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div><Label>الجواب</Label><Textarea value={fd.answer||''} onChange={e => setFD({...fd,answer:e.target.value})} className="bg-[#0a0a15] border-purple-500/20 mt-1" rows={4} /></div><div><Label>الترتيب</Label><Input type="number" value={fd.order||0} onChange={e => setFD({...fd,order:parseInt(e.target.value)})} className="bg-[#0a0a15] border-purple-500/20 mt-1" /></div><div className="flex items-center gap-2"><Switch checked={fd.active!==false} onCheckedChange={v => setFD({...fd,active:v})} /><Label>نشط</Label></div></>}
        </div>
        <DialogFooter><Button variant="outline" className="border-purple-500/30" onClick={() => setShowDlg(false)}>إلغاء</Button><Button className="bg-purple-600 hover:bg-purple-500" onClick={saveForm}>حفظ</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={showDeliver} onOpenChange={setShowDeliver}><DialogContent className="bg-[#12121f] border-purple-500/20">
        <DialogHeader><DialogTitle>تسليم يدوي</DialogTitle></DialogHeader>
        {delOrder&&<div><p className="text-sm text-gray-400 mb-2">الطلب: #{delOrder.id?.slice(0,8)}</p><p className="text-sm text-orange-400 mb-2">المطلوب: {delOrder.items?.[delIdx]?.pendingCount} كود</p>
          <Label>الأكواد (كل كود في سطر)</Label><Textarea value={delCodes} onChange={e => setDelCodes(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1 font-mono" rows={5} /></div>}
        <DialogFooter><Button variant="outline" onClick={() => setShowDeliver(false)}>إلغاء</Button><Button className="bg-orange-600 hover:bg-orange-500" onClick={handleDeliver}>تسليم</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>);
  };

  const Footer = () => (<footer className="border-t border-purple-500/10 mt-16 py-8"><div className="container mx-auto px-4"><div className="flex flex-col md:flex-row items-center justify-between gap-4">
    <div className="flex items-center gap-2">{settings.logo ? <img src={settings.logo} alt="" className="h-6" /> : <Zap className="w-5 h-5 text-purple-500" />}<span className="font-bold text-gray-400">{settings.siteName||'FAST STORE'}</span></div>
    <div className="flex items-center gap-4">
      {settings.whatsapp&&<a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-green-400"><MessageCircle className="w-5 h-5" /></a>}
      {settings.discord&&<a href={settings.discord} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-indigo-400"><Gamepad2 className="w-5 h-5" /></a>}
      {settings.telegram&&<a href={`https://t.me/${settings.telegram}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-blue-400"><Send className="w-5 h-5" /></a>}
    </div>
    <p className="text-gray-500 text-sm">{settings.footerText||'جميع الحقوق محفوظة'} &copy; {new Date().getFullYear()}</p>
  </div></div></footer>);

  return (<div className="min-h-screen"><Toaster theme="dark" position="top-center" richColors />
    {page==='admin'&&user?.role==='admin' ? <AdminPanel /> : <>
      <Header /><main className="container mx-auto px-4 py-6">
        {page==='home'&&<HomePage />}{page==='search'&&<HomePage />}{page==='category'&&<CategoryPage />}{page==='product'&&<ProductDetail />}
        {page==='cart'&&<CartPage />}{page==='checkout'&&<CheckoutPage />}{page==='orders'&&<OrdersPage />}{page==='order'&&<OrderDetail />}
        {(page==='login'||page==='register')&&<LoginPage />}{page==='profile'&&user&&<ProfilePage />}{page==='reset-password'&&<ResetPasswordPage />}
      </main><Footer /></>}
  </div>);
}

function SetupPage({ onSetup }) {
  const [n, setN] = useState(''); const [e, setE] = useState(''); const [p, setP] = useState(''); const [b, setB] = useState(false);
  const h = async (ev) => { ev.preventDefault(); setB(true); try { await onSetup(n,e,p); } catch(err) { toast.error(err.message); } finally { setB(false); } };
  return (<div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4"><Toaster theme="dark" position="top-center" richColors />
    <Card className="bg-[#12121f] border-purple-500/20 w-full max-w-md p-8 neon-glow">
      <div className="text-center mb-8"><Crown className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-float" /><h1 className="text-2xl font-bold neon-text">إعداد المتجر</h1><p className="text-gray-400 mt-2">أنشئ حساب المدير الأول</p></div>
      <form onSubmit={h} className="space-y-4"><div><Label>الاسم</Label><Input value={n} onChange={e => setN(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required /></div>
        <div><Label>البريد الإلكتروني</Label><Input type="email" value={e} onChange={ev => setE(ev.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required /></div>
        <div><Label>كلمة المرور</Label><Input type="password" value={p} onChange={e => setP(e.target.value)} className="bg-[#0a0a15] border-purple-500/20 mt-1" required /></div>
        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 py-5" disabled={b}>{b?<Loader2 className="w-4 h-4 animate-spin ml-2" />:<Zap className="w-4 h-4 ml-2" />} إنشاء حساب المدير</Button></form>
    </Card></div>);
}
