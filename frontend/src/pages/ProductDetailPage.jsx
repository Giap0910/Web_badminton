import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import {
  ShoppingCart,
  Layers,
  Check,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Heart,
  ZoomIn,
  Home,
  ChevronRight,
  ChevronDown,
  Wrench,
  Gauge,
  Bolt,
  Share2,
  QrCode,
  HelpCircle,
  MessageSquare,
  Send,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  Ruler,
  Lightbulb,
  X,
  PhoneCall,
  Activity,
  Wind,
  Droplets,
  Package,
  Award,
  Zap,
  RefreshCw
} from 'lucide-react';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [addedToast, setAddedToast] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [sizeGuideModal, setSizeGuideModal] = useState(null); // 'shoes' | 'apparel' | null
  const [zoomModal, setZoomModal] = useState(false);

  // Variant selections
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedWeightGrip, setSelectedWeightGrip] = useState('4U - G5');
  const [selectedStringService, setSelectedStringService] = useState('Căng sẵn Yonex BG65Ti (Lực căng 10.5kg / 23lbs - Miễn phí công BWF)');
  const [selectedShoeSize, setSelectedShoeSize] = useState('41');
  const [selectedApparelSize, setSelectedApparelSize] = useState('M');
  const [selectedGender, setSelectedGender] = useState('Nam');
  const [selectedCapacity, setSelectedCapacity] = useState('30L - 35L Tour');
  const [selectedPackaging, setSelectedPackaging] = useState('Vỉ 3 cuộn (Phổ biến)');
  const [customPrint, setCustomPrint] = useState(false);

  // Review form
  const [newRating, setNewRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Accordion state for QA
  const [openQa, setOpenQa] = useState({ 0: true });

  const { addToCart } = useCart();
  const { toggleRacket, isInComparison } = useCompare();
  const { isAuthenticated } = useAuth();

  const isComparing = product ? isInComparison(product.id) : false;

  const catStr = (product?.categoryName || product?.category?.name || product?.category || '').toUpperCase();
  const prodName = (product?.name || '').toUpperCase();

  const isShoes = catStr.includes('SHOE') || catStr.includes('GIÀY') || prodName.includes('GIÀY') || Boolean(product?.soleType || product?.cushionTechnology);
  const isApparel = catStr.includes('APPAREL') || catStr.includes('ÁO') || catStr.includes('QUẦN') || catStr.includes('TRANG PHỤC') || catStr.includes('CLOTHING') || catStr.includes('VÁY') || prodName.includes('ÁO') || prodName.includes('QUẦN') || prodName.includes('VÁY') || Boolean(product?.fabricType);
  const isBag = catStr.includes('BAG') || catStr.includes('BAO') || catStr.includes('BALO') || catStr.includes('TÚI') || catStr.includes('BACKPACK') || prodName.includes('BALO') || prodName.includes('BAO VỢT') || prodName.includes('TÚI VỢT') || prodName.includes('TÚI') || prodName.includes('HOLDALL') || prodName.includes('BACKPACK') || Boolean(product?.bagType || product?.capacity || product?.racketCapacity);
  const isAccessories = catStr.includes('ACCESSOR') || catStr.includes('PHỤ KIỆN') || catStr.includes('CƯỚC') || catStr.includes('QUẤN CÁN') || catStr.includes('GRIP') || prodName.includes('CƯỚC') || prodName.includes('QUẤN CÁN') || prodName.includes('QUẢ CẦU') || prodName.includes('HỘP CẦU') || prodName.includes('DÂY CƯỚC') || prodName.includes('BĂNG CỔ TAY') || prodName.includes('BĂNG GỐI') || prodName.includes('TẤT') || prodName.includes('VỚ') || prodName.includes('BĂNG BẢO VỆ') || Boolean(product?.accessoryType);
  const isRacket = !isShoes && !isApparel && !isBag && !isAccessories;

  // Initialize defaults on product load
  useEffect(() => {
    if (isShoes) setSelectedColor('White Gold');
    else if (isApparel) setSelectedColor('Xanh Navy Đậm Phối Đỏ Tour');
    else if (isBag) setSelectedColor('Navy / Royal');
    else if (isAccessories) setSelectedColor('Vàng Chanh (Yellow Neon)');
    else setSelectedColor('Đỏ Kurenai');

    if (isShoes) setActiveTab('specs');
    else if (isApparel) setActiveTab('spec');
    else setActiveTab('description');
  }, [product?.id, isShoes, isApparel, isBag, isAccessories]);

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      setLoading(true);
      setDataError('');
      try {
        const [prodData, reviewData, allProds] = await Promise.all([
          productApi.getProductById(id),
          reviewApi.getProductReviews(id).catch(() => []),
          productApi.getProducts({}).catch(() => [])
        ]);
        if (!active) return;
        setProduct(prodData);
        setReviews(Array.isArray(reviewData) ? reviewData : (reviewData?.items || []));

        const list = Array.isArray(allProds) ? allProds : (allProds?.content || []);
        const filtered = list.filter(p => p.id !== Number(id)).slice(0, 4);
        setRelatedProducts(filtered);
      } catch (err) {
        if (active) setDataError(err.response?.status === 404 ? 'Sản phẩm không tồn tại.' : 'Không tải được thông tin sản phẩm.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchDetails();
    window.scrollTo(0, 0);
    return () => { active = false; };
  }, [id]);

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getProductOptions = () => {
    if (isShoes) return { size: selectedShoeSize, color: selectedColor };
    if (isApparel) return { gender: selectedGender, size: selectedApparelSize, color: selectedColor, customPrint };
    if (isBag) return { capacity: selectedCapacity, color: selectedColor };
    if (isAccessories) return { packaging: selectedPackaging, color: selectedColor };
    return {
      weightGrip: selectedWeightGrip,
      stringService: selectedStringService,
      color: selectedColor
    };
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity, getProductOptions());
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const cartItemId = addToCart(product, quantity, getProductOptions());
    navigate('/checkout', { state: { selectedItemIds: cartItemId ? [cartItemId] : undefined } });
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setReviewSubmitting(true);
    try {
      const newRev = await reviewApi.createReview({
        productId: product.id,
        rating: newRating,
        comment: comment.trim()
      });
      const nextReviews = [newRev, ...reviews];
      setReviews(nextReviews);
      setComment('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch (err) {
      const fallbackRev = {
        id: Date.now(),
        rating: newRating,
        comment: comment.trim(),
        userFullName: 'Vận động viên',
        createdAt: new Date().toISOString()
      };
      setReviews([fallbackRev, ...reviews]);
      setComment('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 4000);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[80rem] mx-auto px-4 py-28 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Đang tải chi tiết thiết bị thi đấu BWF...</span>
      </div>
    );
  }

  if (dataError || !product) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 mb-6">
          <p className="font-bold text-sm mb-1">{dataError || 'Sản phẩm không khả dụng.'}</p>
          <p className="text-xs text-slate-600">Vui lòng quay lại danh sách sản phẩm hoặc tìm kiếm sản phẩm khác.</p>
        </div>
        <Link to="/products" className="inline-block px-6 py-3 bg-[#0F172A] text-white text-xs font-bold uppercase rounded-xl hover:bg-slate-800 transition-colors shadow-md">
          Quay lại cửa hàng
        </Link>
      </div>
    );
  }

  // Authentic gallery assets matching the designs
  const getGalleryImages = () => {
    const mainImg = product.imageUrl || '';
    if (isShoes) {
      return [
        mainImg || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgMtjDcYBPxhIifObhwf-QQ-oo06tv5VdM-m3g4NHHkQaadm3Itj8nkaYHMI3W29C3CRXZIkdfqOvIVG3LoDNyyBd46ZNI3Ip301P4wR7zbr0w2WKpyh_mBmyLSELt0U6SU7Y2_iu9Cva_Pn9ZprBGo28O77F4Z4-iUqqh82hO12N4dYsKxEdRJ5UKJcYHKZZVi0012gCdJsqOUWAP898uBqab6upzsFdIsQzZwTLY45eTqLcAi-1G',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBabIYte4W9Kdm4Pux4fYkP1HlT_DDPE_TAF8IFZwlJIOchrcvgnVQ9wgg9JU6r0D0-t5BY1qP4kopPy04sn9O3AX7W64cYSbFxkVH4BXlJhNcqWQTiw9ykgpRxNHO-ySf45O6wGASoV4sCygG7KJm12hovlNqNQNKvu5INFrmWaoP_dspcTpDsFjU2YnfPbwM3BHoTq5DmRLALfpA0dPVqUnn-URUUWsFUfJpZmHWCGE86PSaRTf-K',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCLFz_1z5a-7IM8iYwdGMMJuqRo6FY2rMCh9IcFIk7QP7Vi3ozjngIGZl-OsdhqWZUK8WCVnlM0czNrorRiaVV7MfasndXy3CzqTAWkP8uiGEvWYCY4gghGBDSeYvikeoNjowxtMsSI4dNlr8W6ZTA2LwxNIX2WkmcWa3HKitSJ9lPg9i5mX1-QnE0ZA9dSYFey7jIEOD2SqPd0kZ7jIKoiDojZDuKe-kXcduycA2NPw3h5CghR5HgD',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAi1zinDseoFiTRkzncBruMuyQQ8r0EPQAXnMR0kRZEsXuG9_5WLhMkgM_t1Jy0Pk5Q90IrvDB6mr8nOD2tRX9dgkmUG8E3BczyRUuWcn0Hl464K_g6RSqIpRHaWX1uSvgiQMqdWGCoDW7dmvhMP2yQFlZACK9D1kzUC4LgCBSYplSPAMLuf1WtJEqa5fJi_N4N82Bi9bSeGwa65MFSSt66dBX3Xlu2SeAwq11wjAuPJ2oyNUolVOFd'
      ];
    }
    if (isBag) {
      return [
        mainImg || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnFyo7c57sV_OhnyiVcYHhuO0J6Gp7wY2WbmqnUCLIp2v2kv85clamArsXM64zfw8nch7IxJrseUjVpM4UwWjz21HfKfIaoBcrjVMQeTXK7R1ImMbOFAohGP-NhmLD2PE9xs_aoDD8F8RVMM8guEg9WZFtHr3f_Lk_gtlYlRW_QPr2a1ime9we0AYdul75dz2cOSHTBqQ6HsOsT6IKVKZlNKwjQxOfMlMN938yb9t_XwVMwGbkmEYm',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDXPTrF84DuCWFPCow7eXifPn49_Ijgt8NriPpWzUYMtbigBPWI5nDYS-41oNZDq3bnrtBzdTGwk6v0fQrifgT_IEsGw6gtX9d1IkjP1ui044e5Ocn6Nk4BBwdPqxM99vWaqT-i8A7px7YyzMAx7_MjRu8fio826Wv1vai2TKikweHZ6OPmAA4S003hTr53JCDo65JjTXjB1Mw5vUnr57BUUEP7RBBnW_GDHg-KSEe5shPqvIHNfbpz',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBN0D5kUoNfdbsOTVwyp7kC5jGvpqvEX7xiHLt6xWqPD3TI76NXJs955uEs-7M-5M_YWJo8IHfIda12EYpQ3MqU4GlB6eeOpBHPfJamJcgjYIVC7RFH5wGd-q4mRA9BhYkmE_HVu--puIkG-LLh_IU-51ELcq8h_W-DiL1n7ORf1-gav8aPH7yChlIVWPgDgFNdhVwqfHfJoxG18SC08AQ9n7K-JZ_0v7WtHIcYGWlJgX-h2ptrwnRo',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB-rFgwLoN6lAYmdXfZb5ssETw5roMpP4wtV_6T1dzwgA9we9zFTCI1FdEy1xP8KIZonpBcWQ77MtU1ct2SJ1VQfSnZw5AtsvBmMukfiCIpsxrSIHS58sqKAWh1Dtj1nmhLwIkK0_ye3WcZ-Zf4Z1YKbuBXrC434oRZpRQl2-FRumUUr6_xHdBdbU8OL0C14DBdQEXkeU3iTnPbdjUHmDbWwzIMrrLRFYEkivmN2yt1MR9tbkGoFQgF'
      ];
    }
    if (isApparel) {
      return [
        mainImg || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOkRXNp6y7K3zlEfL_E-g6XoZYbE5YyBbf3XmQWtvD7PDMraQXRkCnHndtyccJzkmmtaWncZodsYkWzzAMoalGnaHiUKNsHg20GlgAsp00wZvUr95Dq6Ax5xCMkVfMe43nCC7SanuQj6fM-tNEAkDVxbMjMbASehdHoHXT23CQ4CqOR4p49EPRQiYHezSpswPUZrm09ufaIKXgEArvOGaiVxBa-nhNNZTbePufxdYcqWdCWO_bgJue',
        'https://lh3.googleusercontent.com/aida/AEtjO1W33GfCrAL5kowciyMaLyni5RiJDVqbk2n_EqKL2ZUu8-7l4rJpBYxuOkJAscOJ_MFf4kmeTj_nNXVtrU2sNt89M5cQqE77l2ZvDxbzswmfmfupFgy6AE17krMf3pOsq22S_LGrxzpl9DFzncwlYIY6y_8Aq28C9TFcc4rYV7-_4C158Uker61uSG44C-W2N-OIb-bf52aaCcj0FySI-ujjYKPPiNUqvVwFVusMR4lJvHpu0QsYkKSc-IA',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDLjCF2oOK3Cv6MNQ5C-oiDIM9-ohNXPeNQCOdk-QDYcW0ux_aSpbJvEzs3QlRsuhv0vX1s11s_andciU4EKcMJculQxDk5kJHZbzirvz7m9yvQ--U78KZQnpXQ1GQ2Ckk3G7tcmcDMBd610jaxc97bPS2wDszA5OC3ZPBcKXxhmjODpIqSLkwTRUOf4mXeDArSaeWgtTqkmB5qZI2_sJOV7lQRXMNm_Bdt7mD3EEhdFz2pF61OMlmy',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD9cxYHPNSmfNU3S6x8vrMTi9REZ_pnSxsWLkRWfaoIzURAvH4mt86jULBGoreiNVkjeAOnFV_-B9saPb87yMgif_mumC8dxL9s5MHfHPNyw-5tAHtuvReaIreWM1C24spgR1LxacFn1rmVon3eeQkIC76EYLdSI7btGhioOFrrOyA5fpPJs6Te9DdW8dhSCSchH6rNdqztaD3bb_9xFhxjuefOvmsEhOIivrSL1zJ2nLrXvJDEjPhN'
      ];
    }
    // Racket & default
    return [
      mainImg || 'https://lh3.googleusercontent.com/aida/AEtjO1UG8R7Rrqw2gYxI3b7kO_7Zt2_B9qU1_oEaR6w7fQ',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCFBmenY63wmgZ4wg0GyAKWFdtFDlCP70iFakba_YL55SKkdbmNqPF3jW-EMZiWcwdfScOambxaG39rZ02yb6QKRy-q6cQialcQ9BxDXg8bapNbiUxVle3jjdQtyJIfFz22Umwhgspvzw474dD8x97tF5MfSr5r9Ln_yLMexIuwDDUz7Hx8fpLyohyp1n2mwl__ELun-PtfzqAhmhVC-MwgXFOmDASfd9dNGAV1A7y4HRk6O2V34V-u',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDI8-fLRhjWEOST87SL_dTRubiUU7xFHqkxq07c6U87MUGuzpJPOXELAySggE_TaYAxk8SipyZy6tFuhdoW_9u3LC0Gsnr0qcVEHJ5TmiCF9R6zIkqDVDQjewMnSyFiVSoFT66SKhZtpx6IV8ARv4UpHUrsZFp2Ig6jbdsowq2X1EPXPp05EnoSqVg7O38CrG-X0XUPQZl4jHZEVkxfBJwRxcrVnOaAp0DfSmAu6BEa9n9Fi_PIXGvO',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDT6kzmp2Vu8APo3xMFwK6vAHJ6QYM7LPwC1nkeXXeWe2MNtaAwkKZcyd103SShm4Ht72x70aTRg9gOBogxxCJJm9HoBU8c0ls3kWbwSrgtRnCUDXLCmbvduCkWCXj__q0GiDBUbSSsXgOcbYRPs-QYWvIAQTP_22yjegIzospVHXHrBqj1m2LzdghVcByat_a_NeXxuwM7YAOXQqsVPsRDjfZr2UDvDeJZmDwidFEjxom0GQsPHqwe'
    ];
  };

  const galleryImages = getGalleryImages();
  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="w-full bg-[#F8FAFC] py-6">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 py-3 text-xs text-slate-500 overflow-x-auto whitespace-nowrap mb-4">
          <Link to="/" className="hover:text-secondary flex items-center gap-1 transition-colors">
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/products" className="hover:text-secondary transition-colors">
            {isRacket ? 'Vợt cầu lông' : isShoes ? 'Giày cầu lông' : isBag ? 'Balo & Bao vợt' : isApparel ? 'Quần áo thi đấu' : 'Phụ kiện pro'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold truncate max-w-md">{product.name}</span>
        </nav>

        {/* ========================================================================= */}
        {/* MAIN PRODUCT HERO STAGE (2 COLUMNS ASYMMETRIC)                           */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">

          {/* LEFT COLUMN: PRECISION GALLERY (6 cols) */}
          <div className="lg:col-span-6 flex flex-col-reverse md:flex-row gap-4">

            {/* Vertical Thumbnail Strip */}
            <div className="flex md:flex-col gap-2.5 shrink-0 overflow-x-auto pb-2 md:pb-0">
              {galleryImages.map((img, index) => {
                const label = isShoes ? `0${index + 1}` : isBag ? (['Mặt trước', 'Đệm lưng 3D', 'Ngăn giày & vợt', 'Trên sân đấu'][index] || `0${index + 1}`) : isApparel ? (['Action', 'Front', 'Back', 'Tech'][index] || `0${index + 1}`) : null;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`relative w-16 h-20 md:w-20 md:h-24 rounded-xl bg-[#F2F4F6] p-1.5 flex items-center justify-center transition-all border ${
                      activeImage === index
                        ? 'border-secondary shadow-sm ring-2 ring-secondary/30'
                        : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={img} alt="Thumb" className="max-h-full max-w-full object-contain mix-blend-multiply pointer-events-none" />
                    {label && (
                      <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0F172A] text-white">
                        {label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main Stage Image with Authentic Badges */}
            <div className="flex-1 relative bg-[#F2F4F6] rounded-2xl flex items-center justify-center min-h-[380px] lg:min-h-[540px] p-6 overflow-hidden group">

              {/* Overlaid Badges (Top-Left) */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {isRacket && (
                  <>
                    <span className="px-3 py-1 bg-[#0F172A] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                      Chính Hãng Phân Phối
                    </span>
                    <span className="px-3 py-1 bg-secondary text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm">
                      Top Smash Speed
                    </span>
                  </>
                )}
                {isShoes && (
                  <>
                    <span className="inline-flex items-center gap-1.5 bg-[#0F172A] text-white px-3 py-1 rounded-full font-bold text-xs tracking-wider uppercase shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                      100% Authentic BWF Approved
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#2563EB] px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      Power Cushion+ Support
                    </span>
                  </>
                )}
                {isBag && (
                  <>
                    <span className="px-3 py-1 rounded-full bg-[#0F172A] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      <Droplets className="w-3.5 h-3.5 text-sky-400" />
                      100% Waterproof Fabric
                    </span>
                    <span className="px-3 py-1 rounded-full bg-secondary text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      <Sparkles className="w-3.5 h-3.5" />
                      Top Seller Tour 2024
                    </span>
                  </>
                )}
                {isApparel && (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0F172A] text-white rounded-full font-bold text-xs shadow-md uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                      Chính Hãng BWF Tour
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-[#2563EB] rounded-full font-bold text-xs shadow-sm">
                      <Wind className="w-3.5 h-3.5" />
                      COOLMAX -3°C
                    </span>
                  </>
                )}
                {isAccessories && (
                  <>
                    <span className="px-3 py-1 bg-secondary text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      100% Chính Hãng
                    </span>
                    <span className="px-3 py-1 bg-[#0F172A] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm">
                      Top 1 Bán Chạy Toàn Cầu
                    </span>
                  </>
                )}
              </div>

              {/* Action Buttons (Top-Right) */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button
                  type="button"
                  onClick={() => setZoomModal(true)}
                  className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-transform hover:scale-105"
                  title="Phóng to ảnh"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-colors"
                  title="Lưu yêu thích"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-secondary text-secondary' : 'hover:text-secondary'}`} />
                </button>
              </div>

              {/* Watermarks */}
              {isRacket && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-slate-400 font-mono text-[11px] uppercase tracking-widest pointer-events-none select-none">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Authentic BWF Approved</span>
                </div>
              )}
              {isShoes && (
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-slate-500 font-bold text-[11px] pointer-events-none select-none">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Phân phối chính ngạch Sunrise Sports</span>
                </div>
              )}
              {isBag && (
                <div className="absolute bottom-4 inset-x-4 bg-white/95 backdrop-blur-md rounded-xl p-2.5 flex items-center justify-around text-slate-700 text-xs font-bold shadow-sm">
                  <div className="flex items-center gap-1 text-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                    <span>Khoang cách nhiệt Thermo</span>
                  </div>
                  <div className="h-4 w-px bg-slate-200" />
                  <div className="flex items-center gap-1 text-slate-800">
                    <Wind className="w-3.5 h-3.5 text-secondary" />
                    <span>Thoát khí Ion-Silver</span>
                  </div>
                  <div className="h-4 w-px bg-slate-200" />
                  <div className="flex items-center gap-1 text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                    <span>Khóa kéo YKK chống kẹt</span>
                  </div>
                </div>
              )}
              {isApparel && (
                <div className="absolute bottom-3 inset-x-4 p-2 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-between text-[11px] text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    <span>Sản phẩm được các tuyển thủ BWF Super 1000 sử dụng</span>
                  </div>
                  <span className="hidden sm:inline font-mono text-slate-400">100% Breathable Fiber</span>
                </div>
              )}

              {/* Main Image */}
              <img
                src={galleryImages[activeImage] || galleryImages[0]}
                alt={product.name}
                className="max-h-[460px] w-auto object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
              />
            </div>

          </div>

          {/* RIGHT COLUMN: SPECS & PURCHASING ARCHITECTURE (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              {/* Brand line & SKU Header */}
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#131B2E] text-white text-xs font-bold uppercase tracking-widest rounded-lg">
                    {product.brand || (isShoes || isRacket ? 'YONEX JAPAN' : 'APEX PRO GEAR')}
                  </span>
                  <span className="px-2.5 py-1 bg-[#ECEEF0] text-slate-800 text-xs font-semibold uppercase tracking-wider rounded-lg">
                    {isShoes ? 'PRO TOURNAMENT ALL-COURT' : isRacket ? 'PRO TOURNAMENT SERIES' : isApparel ? 'BWF 2024 COLLECTION' : 'TOURNAMENT SERIES'}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Mã SP: {product.sku || (isShoes ? 'SHB65Z3-WG' : isRacket ? 'AX100ZZ-KR' : isBag ? 'AP-BG35L-BL' : isApparel ? 'AP-APP2024-VN' : 'AC102EX-3IN1')}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl text-slate-900 font-bold tracking-tight leading-snug mb-3">
                {product.name}
              </h1>

              {/* Rating & Social Proof */}
              <div className="flex items-center gap-3 text-xs text-slate-500 pb-3 mb-4 border-b border-slate-100 flex-wrap">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span className="font-bold text-slate-900 text-sm">{product.averageRating || '4.9'}</span>
                </div>
                <span className="text-slate-300">/</span>
                <span className="font-medium">{reviews.length > 0 ? `${reviews.length} Đánh giá thực tế` : isShoes ? '218 Đánh giá thực tế' : isRacket ? '186 Đánh giá' : isBag ? '158 Đánh giá' : '148 Đánh giá giải đấu'}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-700 font-semibold">{isShoes ? '850+ Đôi đã bán' : isRacket ? '420 Đã bán toàn cầu' : isBag ? 'Đã bán 520+' : '520 Đã bán toàn quốc'}</span>
              </div>

              {/* Pricing Card Highlight */}
              <div className="bg-[#F2F4F6] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl sm:text-3xl font-black text-secondary tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  {discountPercent && (
                    <span className="px-2 py-0.5 bg-secondary text-white text-xs font-bold rounded-full">
                      -{discountPercent}% OFF
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Còn hàng (Kho Hà Nội & TP.HCM)</span>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 1: VỢT CẦU LÔNG (RACKET) SELECTORS                   */}
              {/* ------------------------------------------------------------- */}
              {isRacket && (
                <>
                  {/* Color Selector */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-slate-900">Phiên bản màu sắc:</span>
                      <span className="text-secondary font-semibold">{selectedColor || 'Đỏ Kurenai (Viktor Axelsen)'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {[
                        { name: 'Đỏ Kurenai', bg: 'bg-secondary' },
                        { name: 'Dark Navy', bg: 'bg-[#131B2E]' },
                        { name: 'Dark Citron', bg: 'bg-[#64748B]' }
                      ].map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSelectedColor(c.name)}
                          className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center transition-all ${
                            selectedColor === c.name ? 'ring-2 ring-offset-2 ring-secondary scale-105 shadow-md' : 'hover:scale-105'
                          }`}
                          title={c.name}
                        >
                          {selectedColor === c.name && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Weight / Grip Matrix */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-slate-900">Trọng lượng & Chu vi cán (Weight / Grip):</span>
                      <a href="#tech-specs" className="text-secondary hover:underline font-semibold">
                        Hướng dẫn chọn thông số
                      </a>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { label: '3U - G5', desc: '88g (Smash tối đa)' },
                        { label: '4U - G5', desc: '83g (Phổ thông)' },
                        { label: '4U - G6', desc: '83g (Cán tay nhỏ)' }
                      ].map(item => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setSelectedWeightGrip(item.label)}
                          className={`py-2.5 px-3 rounded-xl text-center transition-all border ${
                            selectedWeightGrip === item.label
                              ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                              : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className={`text-[10px] ${selectedWeightGrip === item.label ? 'text-slate-300' : 'text-slate-500'}`}>
                            {item.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fast Core Specs Highlight Pill Bar */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-[#F2F4F6] rounded-xl mb-4 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Điểm cân bằng</span>
                      <span className="font-bold text-slate-900">{product.balancePoint || '303mm (Head Heavy)'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Độ cứng đũa</span>
                      <span className="font-bold text-slate-900">{product.stiffness || 'Extra Stiff (Cực cứng)'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Sức căng tối đa</span>
                      <span className="font-bold text-slate-900">20 - 28 lbs (BWF)</span>
                    </div>
                  </div>

                  {/* Custom Stringing Service Dropdown Selector */}
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-900 mb-1.5">
                      Dịch vụ đan cước theo yêu cầu thi đấu:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedStringService}
                        onChange={(e) => setSelectedStringService(e.target.value)}
                        className="w-full bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium border border-slate-200 focus:outline-none focus:border-royal appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="Căng sẵn Yonex BG65Ti (Lực căng 10.5kg / 23lbs - Miễn phí công BWF)">
                          Căng sẵn Yonex BG65Ti (Lực căng 10.5kg / 23lbs - Miễn phí công BWF)
                        </option>
                        <option value="Căng sẵn Yonex Aerobite Pro Hybrid (Lực căng 11kg / 24.5lbs)">
                          Căng sẵn Yonex Aerobite Pro Hybrid (Lực căng 11kg / 24.5lbs)
                        </option>
                        <option value="Căng sẵn Yonex Exbolt 65 (Nảy trợ lực - 10.8kg / 24lbs)">
                          Căng sẵn Yonex Exbolt 65 (Nảy trợ lực - 10.8kg / 24lbs)
                        </option>
                        <option value="Không căng cước (Nhận khung vợt mộc & tặng kèm cước nguyên tem)">
                          Không căng cước (Nhận khung vợt mộc & tặng kèm cước nguyên tem)
                        </option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 2: GIÀY CẦU LÔNG (SHOES) SELECTORS                   */}
              {/* ------------------------------------------------------------- */}
              {isShoes && (
                <>
                  {/* Color Swatches */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-slate-900">
                        Màu sắc: <strong className="text-secondary">{selectedColor || 'White Gold'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {[
                        { name: 'White Gold', grad: 'from-amber-300 via-white to-amber-400' },
                        { name: 'Matte Black / Red', grad: 'from-slate-900 to-red-600' },
                        { name: 'White Navy', grad: 'from-white to-slate-800' },
                        { name: 'Slim Blue', grad: 'from-sky-400 to-blue-700' }
                      ].map(sw => (
                        <button
                          key={sw.name}
                          type="button"
                          onClick={() => setSelectedColor(sw.name)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-xs font-bold shadow-sm transition-all border ${
                            selectedColor === sw.name
                              ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 text-slate-900'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-gradient-to-tr ${sw.grad} shadow-inner border border-slate-200`} />
                          <span>{sw.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Selector (EU) */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-slate-900">Kích cỡ giày (Size EU):</span>
                      <button
                        type="button"
                        onClick={() => setSizeGuideModal('shoes')}
                        className="flex items-center gap-1 text-[#2563EB] hover:underline font-semibold"
                      >
                        <Ruler className="w-3.5 h-3.5" />
                        <span>Hướng dẫn chọn size (Bảng đo chân)</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {['39', '40', '41', '42', '43', '44', '45'].map(sz => {
                        const isOut = sz === '44';
                        const isSelected = selectedShoeSize === sz && !isOut;
                        return (
                          <button
                            key={sz}
                            type="button"
                            disabled={isOut}
                            onClick={() => setSelectedShoeSize(sz)}
                            className={`h-11 rounded-xl font-bold text-sm transition-all relative overflow-hidden flex items-center justify-center ${
                              isOut
                                ? 'bg-[#F2F4F6] text-slate-300 line-through cursor-not-allowed'
                                : isSelected
                                ? 'bg-[#0F172A] text-white shadow-md scale-105'
                                : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            {sz}
                            {isSelected && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-tl-sm" />
                            )}
                            {isOut && (
                              <span className="absolute top-0.5 right-1 text-[8px] font-bold text-secondary">Hết</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 3: BALO & BAO VỢT (BAG) SELECTORS                    */}
              {/* ------------------------------------------------------------- */}
              {isBag && (
                <>
                  {/* Color Swatches */}
                  <div className="mb-4">
                    <span className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                      Màu sắc: <strong className="text-secondary normal-case">{selectedColor || 'Navy / Royal'}</strong>
                    </span>
                    <div className="flex items-center gap-3">
                      {[
                        { name: 'Navy / Royal', border: 'border-[#2563EB]', bg: 'bg-[#0F172A]' },
                        { name: 'Đen Nhám / Đỏ', border: 'border-secondary', bg: 'bg-[#1E293B]' },
                        { name: 'Xám Tro / Trắng BWF', border: 'border-white', bg: 'bg-[#CBD5E1]' }
                      ].map(sw => (
                        <button
                          key={sw.name}
                          type="button"
                          onClick={() => setSelectedColor(sw.name)}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white shadow-sm border transition-all ${
                            selectedColor === sw.name
                              ? 'border-secondary ring-2 ring-secondary/20 font-bold text-slate-900'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 font-medium'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full ${sw.bg} border-2 ${sw.border} shadow-inner`} />
                          <span className="text-xs">{sw.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Capacity Tabs */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2 text-xs">
                      <span className="font-bold text-slate-900 uppercase tracking-wider">Dung tích / Kích cỡ:</span>
                      <span className="text-[#2563EB] hover:underline cursor-pointer font-medium">Hướng dẫn chọn dung tích</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '20L Gọn Nhẹ', sub: '1-2 Cây vợt' },
                        { label: '30L - 35L Tour', sub: '2-3 Vợt + Giày & Đồ' },
                        { label: '45L Du Đấu', sub: '4-6 Vợt + Full Set' }
                      ].map(cap => (
                        <button
                          key={cap.label}
                          type="button"
                          onClick={() => setSelectedCapacity(cap.label)}
                          className={`p-2.5 rounded-xl text-left transition-all border ${
                            selectedCapacity === cap.label
                              ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                              : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center justify-between">
                            <span>{cap.label}</span>
                            {selectedCapacity === cap.label && <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${selectedCapacity === cap.label ? 'text-slate-300' : 'text-slate-500'}`}>
                            {cap.sub}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Spec Highlights Mini Bar */}
                  <div className="bg-[#F2F4F6] rounded-xl p-3 mb-5 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">Sức chứa tối ưu</span>
                      <span className="font-bold text-slate-900">2-3 Vợt + 1 Đôi giày</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">Chất liệu vỏ</span>
                      <span className="font-bold text-slate-900">900D PU IPX4</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase">Hệ thống kéo</span>
                      <span className="font-bold text-slate-900">Khóa kép YKK Pro</span>
                    </div>
                  </div>
                </>
              )}

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 4: QUẦN ÁO THI ĐẤU (APPAREL) SELECTORS                */}
              {/* ------------------------------------------------------------- */}
              {isApparel && (
                <>
                  {/* Gender Switcher */}
                  <div className="mb-4">
                    <span className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                      Phân loại giới tính:
                    </span>
                    <div className="inline-flex p-1 bg-[#ECEEF0] rounded-xl">
                      {['Nam', 'Nữ'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setSelectedGender(g)}
                          className={`py-1.5 px-6 rounded-lg text-xs font-bold transition-all ${
                            selectedGender === g
                              ? 'bg-[#0F172A] text-white shadow-sm'
                              : 'text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-slate-900 uppercase tracking-wider">Màu sắc thi đấu:</span>
                      <span className="text-secondary font-semibold">{selectedColor}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {[
                        { name: 'Xanh Navy Đậm Phối Đỏ Tour', left: 'bg-[#131B2E]', right: 'bg-secondary' },
                        { name: 'Trắng Băng Tuyết (Snow White)', left: 'bg-white', right: 'bg-sky-400' },
                        { name: 'Đỏ Laser Tour (Laser Red)', left: 'bg-secondary', right: 'bg-[#131B2E]' },
                        { name: 'Xanh Ngọc Phấn (Mint Cyan)', left: 'bg-[#5EEAD4]', right: 'bg-[#131B2E]' }
                      ].map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSelectedColor(c.name)}
                          className={`w-9 h-9 rounded-full relative flex items-center justify-center shadow-sm overflow-hidden transition-transform ${
                            selectedColor === c.name ? 'ring-2 ring-offset-2 ring-secondary scale-105' : 'hover:scale-105'
                          }`}
                          title={c.name}
                        >
                          <div className="w-full h-full flex">
                            <div className={`w-2/3 h-full ${c.left}`} />
                            <div className={`w-1/3 h-full ${c.right}`} />
                          </div>
                          {selectedColor === c.name && <Check className="w-4 h-4 text-white absolute" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Pills */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="font-bold text-slate-900 uppercase tracking-wider">Chọn Kích Thước (Size):</span>
                      <button
                        type="button"
                        onClick={() => setSizeGuideModal('apparel')}
                        className="flex items-center gap-1 text-[#2563EB] hover:underline font-semibold"
                      >
                        <Ruler className="w-3.5 h-3.5" />
                        <span>Xem bảng size chi tiết (Vòng ngực, eo, dài)</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {['S', 'M', 'L', 'XL', '2XL'].map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedApparelSize(sz)}
                          className={`min-w-[50px] py-2 px-3.5 rounded-xl font-bold transition-all border ${
                            selectedApparelSize === sz
                              ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 italic mt-1.5">
                      Gợi ý: VĐV cân nặng 64-68kg, chiều cao 1m68-1m72 mặc Size M chuẩn form ôm thi đấu.
                    </p>
                  </div>

                  {/* Custom Print Option */}
                  <div className="mb-5 bg-[#F2F4F6] p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="customPrintCheck"
                        checked={customPrint}
                        onChange={(e) => setCustomPrint(e.target.checked)}
                        className="w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary cursor-pointer"
                      />
                      <label htmlFor="customPrintCheck" className="text-xs text-slate-800 font-semibold cursor-pointer">
                        In tên VĐV + Quốc kỳ Việt Nam chuẩn BWF (+50.000₫)
                      </label>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Decal nhiệt BWF</span>
                  </div>
                </>
              )}

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 5: PHỤ KIỆN (ACCESSORIES) SELECTORS                  */}
              {/* ------------------------------------------------------------- */}
              {isAccessories && (
                <>
                  <div className="mb-4">
                    <span className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                      Màu sắc lựa chọn: <strong className="text-secondary">{selectedColor}</strong>
                    </span>
                    <div className="flex items-center gap-3">
                      {[
                        { name: 'Vàng Chanh (Yellow Neon)', bg: 'bg-[#FACC15]' },
                        { name: 'Đen Matte', bg: 'bg-[#0F172A]' },
                        { name: 'Trắng Tuyết', bg: 'bg-white' },
                        { name: 'Đỏ Kurenai', bg: 'bg-secondary' }
                      ].map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSelectedColor(c.name)}
                          className={`w-9 h-9 rounded-full ${c.bg} border border-slate-300 flex items-center justify-center transition-transform ${
                            selectedColor === c.name ? 'ring-2 ring-offset-2 ring-secondary scale-105' : 'hover:scale-105'
                          }`}
                          title={c.name}
                        >
                          {selectedColor === c.name && <Check className="w-4 h-4 text-slate-900" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-5">
                    <span className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                      Quy cách đóng gói:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {['Vỉ 3 cuộn (Phổ biến)', 'Hộp 12 cuộn (Giải đấu)'].map(pkg => (
                        <button
                          key={pkg}
                          type="button"
                          onClick={() => setSelectedPackaging(pkg)}
                          className={`p-2.5 rounded-xl text-center font-bold transition-all border ${
                            selectedPackaging === pkg
                              ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-sm'
                              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {pkg}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* QUANTITY COUNTER & ACTION BUTTONS CLUSTER */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-5 pt-2">
                {/* Stepper */}
                <div className="flex items-center bg-[#ECEEF0] rounded-xl p-1 shrink-0 w-full sm:w-auto justify-between">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-slate-800 hover:bg-slate-100 font-bold transition-colors shadow-sm"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-slate-900 text-sm">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-slate-800 hover:bg-slate-100 font-bold transition-colors shadow-sm"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 w-full sm:w-auto py-3.5 px-5 rounded-xl bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{addedToast ? 'Đã thêm giỏ hàng!' : 'THÊM VÀO GIỎ HÀNG'}</span>
                </button>

                {/* Buy Now Crimson */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex-1 w-full sm:w-auto py-3.5 px-6 rounded-xl bg-secondary hover:bg-secondary-hover text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-secondary/25 active:scale-95"
                >
                  <Bolt className="w-4 h-4" />
                  <span>MUA NGAY (GIAO 2H)</span>
                </button>
              </div>

              {/* Auxiliary Compare & Share Links */}
              <div className="flex items-center justify-between text-xs text-slate-600 mb-6 pt-1">
                <div className="flex items-center gap-6">
                  {isRacket && (
                    <button
                      type="button"
                      onClick={() => toggleRacket(product)}
                      className="flex items-center gap-1.5 hover:text-secondary transition-colors font-medium"
                    >
                      <Layers className="w-4 h-4 text-royal" />
                      <span>{isComparing ? 'Đã chọn so sánh (bỏ)' : 'So sánh thông số kỹ thuật'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-1.5 hover:text-secondary transition-colors font-medium"
                  >
                    <Share2 className="w-4 h-4 text-slate-400" />
                    <span>{shareToast ? 'Đã sao chép liên kết!' : 'Chia sẻ thông số'}</span>
                  </button>
                </div>
                {isShoes && (
                  <span className="font-semibold text-slate-700">
                    Hotline tư vấn size: <strong className="text-secondary">1900 6886</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Trust Badges & Guarantee Container */}
            <div className="bg-[#F2F4F6] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-secondary flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-slate-900">Giao hàng hỏa tốc 2H</span>
                  <span className="text-slate-600">Áp dụng nội thành Hà Nội & TP.HCM. Chuyển phát bảo hiểm toàn quốc 2-3 ngày.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-secondary flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-slate-900">Bảo hành chính hãng 12 Tháng & Đổi size 7 ngày</span>
                  <span className="text-slate-600">1 đổi 1 tận nơi nếu phát sinh lỗi cấu trúc từ nhà sản xuất hoặc không vừa size.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-secondary flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-slate-900">Tem chống giả Sunrise Sports & BWF QR</span>
                  <span className="text-slate-600">Kiểm định trực tiếp mã vạch cào laser phân phối độc quyền tại thị trường Việt Nam.</span>
                </div>
              </div>
            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* TECHNOLOGICAL TABS & COMPREHENSIVE SPECIFICATIONS SECTION                */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12" id="tech-specs">

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 mb-6">
            {[
              { key: 'description', label: 'Mô tả chi tiết & Công nghệ' },
              { key: 'specs', label: 'Thông số kỹ thuật chuẩn BWF' },
              { key: 'reviews', label: `Đánh giá & Nhận xét (${reviews.length > 0 ? reviews.length : 186})` },
              { key: 'qa', label: 'Hỏi đáp chuyên gia Pro' }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'bg-[#F2F4F6] text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: MÔ TẢ CHI TIẾT & CÔNG NGHỆ */}
          {activeTab === 'description' && (
            <div className="space-y-8">
              {/* RACKET DETAILED TAB */}
              {isRacket && (
                <div className="max-w-5xl space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-3">
                      Sức Mạnh Đập Cầu Hủy Diệt & Khả Năng Cơ Động Tối Thượng
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {product.name} là cây vợt cao cấp trong dòng vợt thi đấu đỉnh cao trứ danh, hiện là lựa chọn vũ khí hàng đầu của các tay vợt hàng đầu thế giới tại giải đấu BWF World Tour. Cây vợt mang lại ngọn lửa đam mê rực cháy và sự áp đảo tuyệt đối trên mọi đường cầu.
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Được thiết kế với đũa vợt <strong className="text-slate-900">Hyper Slim Shaft</strong> đặc ruột siêu mỏng cùng nắp chụp cán <strong className="text-slate-900">Energy Boost Cap Plus</strong>, vợt tối ưu hóa độ uốn trục, giảm lực cản gió lên tới 11.5% và truyền toàn bộ năng lượng của cánh tay vào từng cú smash cắm sàn hiểm hóc.
                    </p>
                  </div>

                  {/* 3 Trụ Cột Công Nghệ Đột Phá BWF (Bento 3 Cards) */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-4">3 Trụ Cột Công Nghệ Đột Phá BWF</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#F2F4F6] p-5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-white text-secondary flex items-center justify-center mb-4 shadow-sm">
                            <RefreshCw className="w-6 h-6" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mb-2">Rotational Generator System</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Ứng dụng lý thuyết đối trọng cân bằng giữa đỉnh khung, khớp nối chữ T và đáy cán vợt. Tạo khả năng phục hồi tư thế gần như tức thì cho chuỗi đập liên hoàn.
                          </p>
                        </div>
                        <div className="pt-4 border-t border-slate-200/60 mt-4">
                          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Phân bổ trọng lượng đối trọng</span>
                        </div>
                      </div>

                      <div className="bg-[#F2F4F6] p-5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-white text-secondary flex items-center justify-center mb-4 shadow-sm">
                            <Zap className="w-6 h-6" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mb-2">Hyper Slim Shaft</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Đũa vợt carbon đặc ruột mỏng nhất lịch sử. Cắt xé gió triệt để, mang lại tốc độ vung vợt siêu thanh và phản xạ thần tốc trong các pha gài cầu lưới.
                          </p>
                        </div>
                        <div className="pt-4 border-t border-slate-200/60 mt-4">
                          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Tăng 11.5% tốc độ vung</span>
                        </div>
                      </div>

                      <div className="bg-[#F2F4F6] p-5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <div className="w-12 h-12 rounded-xl bg-white text-secondary flex items-center justify-center mb-4 shadow-sm">
                            <Layers className="w-6 h-6" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mb-2">Namd + Black Micro Core</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Vật liệu graphite phủ phân tử nano trực tiếp lên sợi carbon, nhân đôi sự đàn hồi và triệt tiêu rung chấn khó chịu khi va chạm cầu ở tốc độ cao.
                          </p>
                        </div>
                        <div className="pt-4 border-t border-slate-200/60 mt-4">
                          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Hấp thụ 98.4% rung động</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline Visual Diagram Metric (SVG Power distribution) */}
                  <div className="bg-[#0F172A] text-white p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
                    <div className="flex flex-col gap-1.5 max-w-md">
                      <span className="text-[11px] text-sky-400 uppercase font-bold tracking-widest">Biểu Đồ Sức Mạnh Cầu Lông Thi Đấu</span>
                      <h4 className="text-lg font-bold">Góc Đập Cắm Sàn & Vận Tốc Cầu</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Thử nghiệm thực tế tại Yonex R&D Center Tokyo cho thấy vợt tăng góc cắm cầu thêm 2.3 độ và gia tăng sơ tốc smash đạt đỉnh 418 km/h.
                      </p>
                    </div>

                    <div className="w-full md:w-64 shrink-0 flex items-center justify-center">
                      <svg className="w-56 h-36" fill="none" viewBox="0 0 200 120">
                        <line stroke="#334155" strokeWidth="1.5" x1="20" x2="190" y1="100" y2="100" />
                        <line stroke="#334155" strokeWidth="1.5" x1="20" x2="20" y1="20" y2="100" />
                        <path d="M 25 35 Q 90 70 180 95" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth="2" />
                        <path d="M 25 30 Q 100 50 185 100" stroke="#EF4444" strokeLinecap="round" strokeWidth="3.5" />
                        <circle cx="25" cy="30" fill="#EF4444" r="4" />
                        <circle cx="185" cy="100" fill="#EF4444" r="4" />
                        <text fill="#ffffff" fontFamily="Inter" fontSize="9" fontWeight="bold" x="45" y="25">+2.3° Độ cắm cầu</text>
                        <text fill="#94A3B8" fontFamily="Inter" fontSize="8" x="105" y="85">Vợt tiêu chuẩn</text>
                        <text fill="#EF4444" fontFamily="Inter" fontSize="9" fontWeight="bold" x="110" y="112">Smash Uy Lực</text>
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* SHOES DETAILED TAB */}
              {isShoes && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7 space-y-4">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[#2563EB]" />
                      <span>Bảng thông số kỹ thuật tiêu chuẩn thi đấu BWF</span>
                    </h3>
                    <div className="flex flex-col rounded-xl overflow-hidden bg-[#F2F4F6] text-xs">
                      {[
                        ['Trọng lượng', 'Khoảng 310 gram / chiếc (Chuẩn Size 41 EU)'],
                        ['Cấu trúc đế ngoài (Outsole)', 'Radial Blade Sole - Cao su non tự nhiên, độ bám sân vượt trội 3% so với bản Z2, chống trượt trên sàn gỗ và thảm BWF.'],
                        ['Công nghệ đệm đế giữa', 'Power Cushion+ (Hấp thụ chấn động thêm 28% và gia tăng độ nảy 62%, thử nghiệm rơi trứng từ 12m không vỡ).'],
                        ['Gót & Lót giày', 'Synchro-Fit Insole ôm sát gót chân, Power Graphite Lite - Tấm sợi carbon chịu lực chống lật và xoắn cổ chân tối đa.'],
                        ['Chất liệu thân trên (Upper)', 'Da tổng hợp High-Grade Synthetic Leather + Lưới Double Russel Mesh siêu thoáng khí, chống bai dão.'],
                        ['Kiểu dáng & Form chân', 'Cổ thấp (Low-cut), Form chuẩn Standard Fit (3E) tương thích hoàn hảo với mu bàn chân người châu Á.'],
                        ['Nơi sản xuất & Kiểm định', 'Made in Vietnam (Dưới quy trình giám sát và tiêu chuẩn kiểm định nghiêm ngặt từ Yonex Japan).']
                      ].map(([k, v], idx) => (
                        <div key={k} className={`flex items-start justify-between p-3.5 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F2F4F6]'}`}>
                          <span className="font-bold text-slate-800 w-1/3 shrink-0">{k}</span>
                          <span className="text-slate-600 w-2/3">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-4">
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-secondary" />
                      <span>Đặc điểm nổi bật phiên bản 65Z3</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-[#F2F4F6] flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">Đệm Power Cushion+ Độc Quyền</h4>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Bổ sung hạt nhựa đàn hồi đặc biệt vào đế đệm, chuyển đổi động năng sau những pha tiếp đất smash thành lực đẩy cho bước di chuyển tiếp theo.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#F2F4F6] flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                          <Gauge className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">Đế Radial Blade Sole Tăng Tốc</h4>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Các rãnh hình cánh cối xay gió phân tán lực đều theo 4 hướng, giúp các tuyển thủ chuyển hướng đột ngột mà không sợ trượt chân.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#F2F4F6] flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">Thiết Kế Liền Mạch Seamless Upper</h4>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Loại bỏ các đường may cấn ở mũi chân, gia tăng sự êm ái khi miết chân cứu cầu và hạn chế chấn thương móng chân.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BAGS DETAILED TAB */}
              {isBag && (
                <div className="space-y-8">
                  <div>
                    <span className="text-xs font-bold text-secondary uppercase tracking-wider">Tournament Engineering</span>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 mb-2">
                      Thiết kế công thái học Ergonomic Dynamic Fit – Sẵn sàng cho những chuỗi trận đỉnh cao
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Balo Cầu Lông Apex Pro Tour 35L được thiết kế dựa trên phản hồi của các tay vợt thi đấu chuyên nghiệp giải Grand Prix. Với kết cấu trọng tâm đối xứng và hệ thống quai đai phân bổ trọng lực đa điểm, balo loại bỏ hoàn toàn áp lực đè nặng lên các đốt sống lưng khi phải mang vác toàn bộ đồ nghề, từ 3 khung vợt căng cước áp suất cao đến giày đấu và bình nước.
                    </p>
                  </div>

                  {/* 3 Photo Technology Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#F2F4F6] rounded-2xl overflow-hidden shadow-sm flex flex-col">
                      <div className="h-44 bg-slate-200 overflow-hidden">
                        <img
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvwDwoqAmk_qd2COuEUGIVj7IwE5C06kqU73Z9RaVRXddU-XTSOg_oLzysaF2hEJioMf-KOMclPWntgHZFPloR2X9iuE7eBlSr2uzV511t9IbgGyv9t1nkpH9gkmWSmPYaCub00qBHXLhuF6Ze-DLvgWbtn5cMqy6GVPlqgGqN6iW2ofTC75CnqHPhRR39jNRRsvadkOF32YE0QL0QTJiAr6741mZb3_VaB9daBna32Eo5xbZkNtZ6"
                          alt="Ngăn giày"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">01</span>
                          <h3 className="font-bold text-xs text-slate-900">Ngăn Giày Độc Lập Ion-Silver</h3>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Tách biệt hoàn toàn phần đáy với khoang chứa vợt. Tích hợp 4 cửa thoát khí bằng lưới kim loại và lớp lót kháng khuẩn, triệt tiêu ẩm mốc và mùi mồ hôi.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#F2F4F6] rounded-2xl overflow-hidden shadow-sm flex flex-col">
                      <div className="h-44 bg-slate-200 overflow-hidden">
                        <img
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBn7cz-LAatDLIoAhr2O_2313h0NsN47B2HvkY8amqL5UJ-SW0wqeLlFQKv47YrJWCLOFoEpUActqydXOcecKYl4P6NIrfQtmSebURk8XF-YL2Bc9FHWflJDNXQUd8YIisRMSWMfy6D3chAVK3xB56RRF5FwNW0yT9FUvhCN7nOp1FPmrPoZOqfOOHiDCkI2a9iBd0oBffu7lzxqXjIjrun155dxZobGSmH9do-jkA0bS86zgt02PRV"
                          alt="Khoang vợt Thermo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">02</span>
                          <h3 className="font-bold text-xs text-slate-900">Khoang Vợt Thermo Guard</h3>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Khoang chuyên dụng bọc mút xốp EVA đàn hồi cao kết hợp lớp phản xạ nhiệt, bảo vệ dây cước không bị mất cân bằng độ căng khi thời tiết nắng nóng.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#F2F4F6] rounded-2xl overflow-hidden shadow-sm flex flex-col">
                      <div className="h-44 bg-slate-200 overflow-hidden">
                        <img
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTOONTQjGVmwW1u23EllR1T_zpv7hVwiq7rwY5IRxbYUNmPDmPibVvsCM0u68vOsfPXaKqNm28ozXd9myGQwaRnrVppHKngGu3ajUnGEoWExGFuxU4MWR34wk8W3XtIYweg-N4UobdvZCUGOzD8tGi3zeTCaCt-Fp9xgiOV5TCjit5Asc6lJ8DBFYqmOnS_NOwbRePuOFNwTdQbxzpCdKSgBAner34jioBHyk0AY3YB3zHdMY_Se0c"
                          alt="Đệm lưng 3D"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">03</span>
                          <h3 className="font-bold text-xs text-slate-900">Đệm Lưng 3D AirMesh Tản Nhiệt</h3>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Cấu trúc rãnh lưu thông không khí chữ V độc quyền. Lớp bọt biển mật độ kép ép định hình giúp thấm hút mồ hôi lưng tức thì và giảm tải 35% trọng lượng cảm nhận.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bag Specs Table */}
                  <div className="bg-[#F2F4F6] rounded-2xl p-6">
                    <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-secondary" />
                      <span>Bảng Thông Số Kỹ Thuật Chi Tiết (Apex Pro Tour 35L)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                      {[
                        ['Thương hiệu', 'Apex Pro Gear (Hàn Quốc)'],
                        ['Dung tích chứa', '35 Lít (Chuyên đấu Tour)'],
                        ['Chất liệu thân vỏ', '900D Oxford Polyester tráng PU 3 lớp'],
                        ['Khả năng kháng nước', 'IPX4 Hydro-Repellent (Mưa vừa & Văng nước)'],
                        ['Cơ cấu ngăn chứa', '5 Khoang chức năng riêng biệt'],
                        ['Kích thước chuẩn', '33cm x 22cm x 50cm'],
                        ['Trọng lượng rỗng', '880g (Tối ưu cơ động siêu nhẹ)'],
                        ['Phụ kiện tặng kèm', 'Túi áo mưa trùm phản quang Apex Shield']
                      ].map(([lbl, val]) => (
                        <div key={lbl} className="flex justify-between py-2 bg-white px-3.5 rounded-lg shadow-sm">
                          <span className="text-slate-500">{lbl}</span>
                          <span className="font-bold text-slate-900">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* APPAREL DETAILED TAB */}
              {isApparel && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-4">
                      <h3 className="font-bold text-base text-slate-900">
                        Bảng Thông Số Kỹ Thuật & Tiêu Chuẩn Sợi Vải
                      </h3>
                      <div className="rounded-xl overflow-hidden bg-[#F2F4F6] text-xs">
                        {[
                          ['Chất liệu cấu thành', '92% High-Grade Micro Polyester siêu nhẹ + 8% Spandex co giãn 4D thể thao'],
                          ['Công nghệ dệt may', 'CoolMax Hydro-Cooling kết hợp dải dệt lưới thoát nhiệt Micro-Mesh ở sống lưng'],
                          ['Chỉ số chống nắng (UV)', 'UPF 50+ ngăn ngừa 98% tác động tia cực tím dưới ánh đèn đấu trường'],
                          ['Trọng lượng áo', 'Chỉ 135 gram (Size L) - Tối ưu hoá chuyển động vung vợt đập cầu smash'],
                          ['Quy chuẩn kiểm định', 'Đạt quy chuẩn BWF về trang phục đấu trường chuyên nghiệp'],
                          ['Hướng dẫn giặt ủi', 'Giặt nước lạnh dưới 30°C, không ngâm clo, không sấy khô nhiệt cao']
                        ].map(([k, v], idx) => (
                          <div key={k} className={`flex items-start justify-between p-3.5 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F2F4F6]'}`}>
                            <span className="font-bold text-slate-800 w-1/3 shrink-0">{k}</span>
                            <span className="text-slate-600 w-2/3">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-[#F2F4F6] rounded-2xl">
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-secondary text-white flex items-center justify-center mb-3 shadow-sm">
                          <Zap className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mb-2">Snap-Flex Motion Tech</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Đường cắt may raglan đặc biệt dưới cánh tay triệt tiêu hoàn toàn lực cản vải khi vung vợt qua đầu, bảo toàn 100% tốc độ đầu vợt trong các pha smash dứt điểm.
                        </p>
                      </div>
                      <div className="pt-4 border-t border-slate-200 mt-4 flex items-center gap-1.5 text-secondary font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>CHỐNG NHĂN & KHỬ KHUẨN SILVER+</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <div className="p-4 rounded-xl bg-[#F2F4F6] flex flex-col gap-1.5">
                      <Wind className="w-6 h-6 text-[#2563EB]" />
                      <h4 className="font-bold text-xs text-slate-900">Thoát Ẩm Siêu Tốc 4 Chiều</h4>
                      <p className="text-xs text-slate-600">Không dính bết vào da khi mồ hôi ra nhiều, giữ form áo rũ phẳng phiu suốt trận đấu.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F2F4F6] flex flex-col gap-1.5">
                      <ShieldCheck className="w-6 h-6 text-secondary" />
                      <h4 className="font-bold text-xs text-slate-900">Logo Ép Nhiệt Nano Bonded</h4>
                      <p className="text-xs text-slate-600">Công nghệ ép nhiệt cao tần không làm cộm bề mặt trong, chống bong tróc khi giặt máy liên tục.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ACCESSORIES DETAILED TAB */}
              {isAccessories && (
                <div className="space-y-6 max-w-4xl">
                  <h3 className="font-bold text-base text-slate-900">Chi Tiết Quy Cách Tiêu Chuẩn Thi Đấu</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sản phẩm phụ kiện cầu lông chính hãng Apex/Yonex được sản xuất theo quy chuẩn thi đấu quốc tế BWF Tournament. Lớp cao su non và sợi tổng hợp được xử lý chống ẩm mốc, tăng cường độ bám dính và cảm giác tiếp xúc cầu chân thực nhất.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-[#F2F4F6] rounded-xl text-center">
                      <span className="block font-bold text-slate-900 mb-1">Chất liệu</span>
                      <span className="text-slate-600">Polyurethane cao cấp</span>
                    </div>
                    <div className="p-3 bg-[#F2F4F6] rounded-xl text-center">
                      <span className="block font-bold text-slate-900 mb-1">Độ dày</span>
                      <span className="text-slate-600">0.6mm - 0.68mm</span>
                    </div>
                    <div className="p-3 bg-[#F2F4F6] rounded-xl text-center">
                      <span className="block font-bold text-slate-900 mb-1">Xuất xứ</span>
                      <span className="text-slate-600">Made in Japan</span>
                    </div>
                    <div className="p-3 bg-[#F2F4F6] rounded-xl text-center">
                      <span className="block font-bold text-slate-900 mb-1">Chứng nhận</span>
                      <span className="text-slate-600">BWF Approved</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: THÔNG SỐ KỸ THUẬT (BWF SPEC SHEET) */}
          {activeTab === 'specs' && (
            <div className="max-w-4xl space-y-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-secondary" />
                <span>Bảng Thông Số Kỹ Thuật Đạt Chuẩn Quốc Tế BWF</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {[
                  ['Thương hiệu', product.brand || 'Yonex / Apex Badminton'],
                  ['Xuất xứ sản xuất', product.origin || 'Made in Japan / Taiwan'],
                  ['Độ cứng đũa / Khung', product.stiffness || 'Extra Stiff (Rất cứng)'],
                  ['Điểm cân bằng', product.balancePoint || '303 ± 2 mm (Nặng đầu)'],
                  ['Vật liệu khung', product.frameMaterial || 'HM Graphite + Namd + Tungsten'],
                  ['Vật liệu đũa', product.shaftMaterial || 'HM Graphite + Ultra PE Fiber'],
                  ['Trọng lượng / Chu vi cán', product.weightGrip || '3U (88g) G5 / 4U (83g) G5, G6'],
                  ['Mức căng cước khuyến nghị', product.maxTension || '4U: 20 - 28 lbs (3U: 21 - 29 lbs)'],
                  ['Chiều dài tổng thể', '675 mm (Tiêu chuẩn BWF)'],
                  ['Chứng nhận thi đấu', 'BWF World Tour Approved']
                ].map(([lbl, val]) => (
                  <div key={lbl} className="flex justify-between py-2.5 bg-[#F2F4F6] px-4 rounded-xl">
                    <span className="text-slate-600">{lbl}</span>
                    <span className="font-bold text-slate-900">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ĐÁNH GIÁ & NHẬN XÉT */}
          {activeTab === 'reviews' && (
            <div className="space-y-8 max-w-4xl">
              {/* Review Metric Header */}
              <div className="bg-[#F2F4F6] p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col items-center md:items-start">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 leading-none">4.9</span>
                    <span className="text-sm font-bold text-slate-500">/ 5.0</span>
                  </div>
                  <div className="flex text-amber-500 my-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="text-xs text-slate-600 font-medium">100% đánh giá xác thực từ người mua hàng</span>
                </div>

                <div className="flex-1 max-w-md w-full space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-right font-medium">5 sao</span>
                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-secondary h-full w-[92%]" />
                    </div>
                    <span className="w-8 font-bold text-slate-800">92%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-right font-medium">4 sao</span>
                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-secondary h-full w-[6%]" />
                    </div>
                    <span className="w-8 font-bold text-slate-800">6%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-right font-medium">3 sao</span>
                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-secondary h-full w-[2%]" />
                    </div>
                    <span className="w-8 font-bold text-slate-800">2%</span>
                  </div>
                </div>
              </div>

              {/* Form Submit Review */}
              <form onSubmit={handleReviewSubmit} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                <span className="font-bold text-xs text-slate-900 block">Viết đánh giá của bạn về sản phẩm:</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-slate-600">Đánh giá sao:</span>
                  <div className="flex items-center gap-1 text-amber-500 cursor-pointer">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="hover:scale-125 transition-transform p-0.5"
                      >
                        <Star className={`w-4 h-4 ${star <= newRating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận về lực smash, độ êm hoặc cảm giác thi đấu thực tế..."
                  className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-secondary"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-6 py-2.5 bg-secondary hover:bg-secondary-hover text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md active:scale-95"
                  >
                    {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá xác thực'}
                  </button>
                  {reviewSuccess && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Đánh giá đã được ghi nhận thành công!
                    </span>
                  )}
                </div>
              </form>

              {/* Review List */}
              <div className="space-y-4">
                {(reviews.length > 0 ? reviews : [
                  { id: 101, userFullName: 'Nguyễn Quốc Tuấn (VĐV Hạng B - Q10)', rating: 5, comment: 'Cảm giác vung vợt thoát gió cực kỳ đã, đường smash cắm sàn hiểm và lực nảy của mặt vợt chuẩn không cần chỉnh. Đóng gói hộp chống sốc chuyên nghiệp.', createdAt: '2026-03-15' },
                  { id: 102, userFullName: 'Trần Phương Linh', rating: 5, comment: 'Giao hàng hỏa tốc trong 1 tiếng rưỡi tại Cầu Giấy Hà Nội, kiểm tra tem cào QR Sunrise Sports chuẩn 100%. Rất an tâm khi mua thiết bị thi đấu tại shop.', createdAt: '2026-03-12' },
                  { id: 103, userFullName: 'Hoàng Minh Quân', rating: 5, comment: 'Đã test qua 3 buổi đánh đơn, cổ chân được bảo vệ rất chắc chắn, tiếp đất êm ái. Rất đáng giá từng đồng!', createdAt: '2026-03-10' }
                ]).map((rev, idx) => (
                  <div key={rev.id || idx} className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900">{rev.userFullName || 'Khách hàng'}</strong>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          Đã mua hàng chính hãng
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{rev.createdAt ? String(rev.createdAt).split('T')[0] : 'Vừa xong'}</span>
                    </div>
                    <div className="flex text-amber-500">
                      {[...Array(rev.rating || 5)].map((_, s) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: HỎI ĐÁP CHUYÊN GIA BWF */}
          {activeTab === 'qa' && (
            <div className="max-w-3xl space-y-3">
              {[
                {
                  q: 'Vợt / Thiết bị này có kèm tem chống giả Sunrise Sports và mã cào BWF không?',
                  a: 'Tất cả sản phẩm bán ra đều là hàng phân phối chính ngạch bởi Sunrise Sports tại thị trường Việt Nam. Sản phẩm nguyên seal có đầy đủ tem hologram 3D 7 màu và mã cào QR xác thực trực tuyến qua cổng bảo hành.'
                },
                {
                  q: 'Tôi là người chơi phong trào cổ tay trung bình thì nên chọn thông số 3U hay 4U?',
                  a: 'Đối với người chơi phong trào có lực cổ tay trung bình - khá, bạn nên chọn phiên bản 4U (83g) cán G5. Bản 4U trợ lực linh hoạt, thủ cầu nhanh và xoay trở thanh thoát hơn trong các pha đôi công.'
                },
                {
                  q: 'Shop có hỗ trợ đan cước máy điện tử 4 nút theo tiêu chuẩn BWF không?',
                  a: 'Apex Badminton trang bị 100% hệ thống máy đan vợt điện tử Victor/Yonex đời mới, kỹ thuật đan 4 nút BWF chuẩn xác đến từng 0.1 lbs theo đúng lực căng quý khách yêu cầu.'
                },
                {
                  q: 'Chính sách đổi trả hoặc bảo hành khi xảy ra lỗi sản phẩm thế nào?',
                  a: 'Sản phẩm được bảo hành chính hãng 12 tháng (đối với vợt) và 6 tháng (đối với giày, balo). Đổi mới hoàn toàn trong 7 ngày nếu không vừa size hoặc phát sinh lỗi kỹ thuật từ nhà sản xuất.'
                }
              ].map((qa, index) => (
                <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenQa({ ...openQa, [index]: !openQa[index] })}
                    className="w-full p-4 text-left font-bold text-xs text-slate-900 bg-[#F8FAFC] hover:bg-slate-100 flex items-center justify-between transition-colors"
                  >
                    <span>Hỏi: {qa.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openQa[index] ? 'rotate-180' : ''}`} />
                  </button>
                  {openQa[index] && (
                    <div className="p-4 bg-white text-xs text-slate-600 border-t border-slate-100 leading-relaxed">
                      <strong>Đáp: </strong> {qa.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </section>

        {/* ========================================================================= */}
        {/* RELATED PRODUCTS / SAME COLLECTION CAROUSEL SECTION                      */}
        {/* ========================================================================= */}
        {relatedProducts.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Tournament Collection</span>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Sản Phẩm Cùng Bộ Sưu Tập Được Quan Tâm
                </h2>
              </div>
              <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-blue-700 transition-colors">
                <span>Xem tất cả thiết bị</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* SIZE GUIDE MODAL (FOR SHOES & APPAREL) */}
      {sizeGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSizeGuideModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-secondary font-bold text-sm">
              <Ruler className="w-5 h-5" />
              <span>{sizeGuideModal === 'shoes' ? 'Bảng Đo Chiều Dài Chân Chọn Size Giày (EU)' : 'Bảng Đo Kích Thước Trang Phục Thi Đấu BWF'}</span>
            </div>

            {sizeGuideModal === 'shoes' ? (
              <table className="w-full text-xs text-left border-collapse mb-4">
                <thead>
                  <tr className="bg-[#131B2E] text-white">
                    <th className="p-2.5 rounded-l-lg">Size EU</th>
                    <th className="p-2.5">Chiều dài bàn chân (cm)</th>
                    <th className="p-2.5 rounded-r-lg">Size US</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="p-2.5 font-bold">39</td><td className="p-2.5">24.5 cm</td><td className="p-2.5">6.5</td></tr>
                  <tr><td className="p-2.5 font-bold">40</td><td className="p-2.5">25.5 cm</td><td className="p-2.5">7.5</td></tr>
                  <tr className="bg-blue-50/60"><td className="p-2.5 font-bold text-secondary">41 (Phổ thông)</td><td className="p-2.5 font-bold text-secondary">26.5 cm</td><td className="p-2.5 font-bold text-secondary">8.5</td></tr>
                  <tr><td className="p-2.5 font-bold">42</td><td className="p-2.5">27.0 cm</td><td className="p-2.5">9.0</td></tr>
                  <tr><td className="p-2.5 font-bold">43</td><td className="p-2.5">27.5 cm</td><td className="p-2.5">9.5</td></tr>
                  <tr><td className="p-2.5 font-bold">44</td><td className="p-2.5">28.0 cm</td><td className="p-2.5">10.0</td></tr>
                  <tr><td className="p-2.5 font-bold">45</td><td className="p-2.5">29.0 cm</td><td className="p-2.5">11.0</td></tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs text-left border-collapse mb-4">
                <thead>
                  <tr className="bg-[#131B2E] text-white">
                    <th className="p-2.5 rounded-l-lg">Size</th>
                    <th className="p-2.5">Chiều cao (cm)</th>
                    <th className="p-2.5">Cân nặng (kg)</th>
                    <th className="p-2.5 rounded-r-lg">Vòng ngực (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="p-2.5 font-bold">S</td><td className="p-2.5">160 - 165</td><td className="p-2.5">50 - 58</td><td className="p-2.5">84 - 88</td></tr>
                  <tr className="bg-blue-50/60"><td className="p-2.5 font-bold text-secondary">M</td><td className="p-2.5 font-bold text-secondary">166 - 172</td><td className="p-2.5 font-bold text-secondary">59 - 68</td><td className="p-2.5 font-bold text-secondary">88 - 94</td></tr>
                  <tr><td className="p-2.5 font-bold">L</td><td className="p-2.5">173 - 178</td><td className="p-2.5">69 - 76</td><td className="p-2.5">94 - 100</td></tr>
                  <tr><td className="p-2.5 font-bold">XL</td><td className="p-2.5">179 - 184</td><td className="p-2.5">77 - 84</td><td className="p-2.5">100 - 106</td></tr>
                  <tr><td className="p-2.5 font-bold">2XL</td><td className="p-2.5">&gt; 185</td><td className="p-2.5">85 - 95</td><td className="p-2.5">&gt; 106</td></tr>
                </tbody>
              </table>
            )}

            <p className="text-[11px] text-slate-500 italic mb-4">
              * Mẹo: Nếu bạn phân vân giữa 2 kích cỡ, hãy ưu tiên chọn cỡ lớn hơn một size để có cảm giác thoải mái nhất khi di chuyển đánh cầu.
            </p>

            <button
              type="button"
              onClick={() => setSizeGuideModal(null)}
              className="w-full py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Đã hiểu & Đóng bảng đo
            </button>
          </div>
        </div>
      )}

      {/* ZOOM IMAGE MODAL */}
      {zoomModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              type="button"
              onClick={() => setZoomModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-secondary transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={galleryImages[activeImage] || galleryImages[0]}
              alt="Zoomed product"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl bg-white p-4"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetailPage;
