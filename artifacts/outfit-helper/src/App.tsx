'use client';

import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert,
  Heart, LoaderCircle, LockKeyhole, LogOut, Menu, Plus, Shirt, ShoppingBag, Sparkles,
  Upload, X,
} from 'lucide-react';
import {
  getGetCurrentUserQueryKey, getGetProductQueryKey, getListProductsQueryKey,
  useAnalyzeOutfit, useGetCurrentUser, useGetProduct, useListProducts, useLogIn,
  useLogOut, useSignUp,
} from '@workspace/api-client-react';
import type { ListProductsParams, OutfitAnalysis, Product, StylingLook } from '@workspace/api-client-react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { ErrorBoundary } from '@/components/error-boundary';

const CART_KEY = 'outfit-helper-bag';
const money = (price: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

function getCart(): string[] {
  try {
    const value = localStorage.getItem(CART_KEY);
    return value ? JSON.parse(value) as string[] : [];
  } catch {
    return [];
  }
}

function saveCart(ids: string[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event('bag-change'));
}

function useBagCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(getCart().length);
    update();
    window.addEventListener('bag-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('bag-change', update);
      window.removeEventListener('storage', update);
    };
  });
  return count;
}

function Header() {
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const logout = useLogOut();
  const queryClient = useQueryClient();
  const count = useBagCount();
  const [mobileOpen, setMobileOpen] = useState(false);

  function signOut() {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), null);
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      },
    });
  }

  return <header className="site-header">
    <div className="header-inner">
      <Link href="/" className="brand" data-testid="link-home"><span className="brand-mark">oh</span><span>outfit helper<span className="brand-period">.</span></span></Link>
      <nav className={`main-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-stylist">Stylist</Link>
        <Link href="/shop" onClick={() => setMobileOpen(false)} data-testid="link-shop">Shop</Link>
        {user && <span className="nav-greeting" data-testid="text-user-name">Hello, {user.name.split(' ')[0]}</span>}
        {user
          ? <button className="nav-text-button" onClick={signOut} disabled={logout.isPending} data-testid="button-log-out">{logout.isPending ? 'Signing out…' : 'Sign out'}</button>
          : <Link href="/login" onClick={() => setMobileOpen(false)} data-testid="link-login">Log in</Link>}
      </nav>
      <div className="header-tools">
        <Link href="/cart" className="bag-link" aria-label={`Bag, ${count} items`} data-testid="link-cart"><ShoppingBag size={18} strokeWidth={1.6} /><span>Bag</span><span className="bag-count">{count}</span></Link>
        <button className="mobile-menu" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </div>
  </header>;
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="app-shell"><Header />{children}<footer className="site-footer"><Link href="/" className="footer-brand">outfit helper<span>.</span></Link><span>Wear what feels like you.</span><Link href="/shop">Explore the edit <ArrowUpRight size={14} /></Link></footer></div>;
}

function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [added, setAdded] = useState(false);
  function addToBag() {
    const current = getCart();
    saveCart([...current, product.id]);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }
  return <article className="product-card" data-testid={`card-product-${product.id}`} style={{ animationDelay: `${index * 65}ms` }}>
    <Link href={`/products/${product.id}`} className="product-image-wrap" data-testid={`link-product-${product.id}`}>
      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="product-image" loading="lazy" /> : <div className="image-fallback"><Shirt size={34} strokeWidth={1} /><span>Outfit Helper edit</span></div>}
      <span className="product-category">{product.category}</span>
    </Link>
    <div className="product-info">
      <div><Link href={`/products/${product.id}`} className="product-name">{product.name}</Link>{product.color && <span className="product-color">{product.color}</span>}</div>
      <span className="product-price">{money(product.price)}</span>
    </div>
    <button className="quick-add" onClick={addToBag} data-testid={`button-add-${product.id}`} aria-label={`Add ${product.name} to bag`}>{added ? <><Check size={15} /> Added</> : <><Plus size={15} /> Add to bag</>}</button>
  </article>;
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="error-panel" role="alert" data-testid="status-error"><CircleAlert size={22} /><div><strong>That didn’t load.</strong><p>{message}</p><button className="text-action" onClick={onRetry} data-testid="button-retry">Try again <ArrowRight size={14} /></button></div></div>;
}

function ProductSkeletons() {
  return <div className="product-grid" aria-label="Loading products">{[0, 1, 2, 3].map((item) => <div className="skeleton-product" key={item}><div className="skeleton-image" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div>;
}

function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [occasion, setOccasion] = useState('');
  const [stylePreference, setStylePreference] = useState('');
  const [analysis, setAnalysis] = useState<OutfitAnalysis | null>(null);
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const analyze = useAnalyzeOutfit();
  const productsQuery = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey(), enabled: !!analysis } });
  const products = productsQuery.data ?? [];

  function acceptFile(nextFile?: File) {
    if (!nextFile) return;
    setFileError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(nextFile.type)) {
      setFileError('Choose a JPG, PNG, or WebP image to get started.');
      return;
    }
    if (nextFile.size > 3 * 1024 * 1024) {
      setFileError('This image is a little too large. Choose a file under 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      setFile(nextFile);
      setPreview(result);
    };
    reader.onerror = () => setFileError('We couldn’t open that image. Try another file.');
    reader.readAsDataURL(nextFile);
  }

  function submitAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) {
      setFileError('Add a photo of your outfit before asking for styling ideas.');
      return;
    }
    analyze.mutate({ data: { imageDataUrl: preview, occasion: occasion.trim() || undefined, stylePreference: stylePreference.trim() || undefined } }, {
      onSuccess: setAnalysis,
    });
  }

  return <Shell><main className="home-page page-enter">
    <section className="home-hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-rule" /> YOUR WARDROBE, REIMAGINED</p>
        <h1 className="editorial hero-title">A good outfit<br />starts with <em>you.</em></h1>
        <p className="hero-description">Show us what you’re wearing. We’ll find fresh ways to style it—and the thoughtful finishing touches that make it yours.</p>
        <a className="hero-scroll" href="#styling-desk">LET’S STYLE <ArrowDownRight size={16} /></a>
      </div>
      <div className="hero-art" aria-label="Editorial fashion collage">
        <div className="art-sticker">THE<br />DAILY<br />EDIT <span>№ 01</span></div>
        <div className="art-portrait"><div className="portrait-shape"><span className="portrait-head" /><span className="portrait-body" /><span className="portrait-leg left" /><span className="portrait-leg right" /></div></div>
        <div className="art-caption">PERSONAL STYLE, IN GOOD COMPANY</div>
        <div className="art-corner">01 / 04</div>
      </div>
    </section>

    <section className="styling-desk" id="styling-desk">
      <div className="section-intro">
        <span className="step-index">01</span>
        <div><p className="eyebrow">THE STYLING DESK</p><h2 className="editorial">Start with the piece<br className="desktop-only" /> you already love.</h2></div>
        <p className="intro-side">One photo is all it takes.<br />Your clothes stay yours.</p>
      </div>
      <form className="upload-form" onSubmit={submitAnalysis}>
        <div className={`upload-drop ${preview ? 'has-preview' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files[0]); }}>
          {preview
            ? <><img src={preview} alt="Your uploaded outfit" className="upload-preview" /><div className="preview-overlay"><span>{file?.name}</span><button type="button" onClick={() => { setFile(null); setPreview(''); setAnalysis(null); }} className="remove-photo" aria-label="Remove photo" data-testid="button-remove-photo"><X size={16} /></button></div></>
            : <button type="button" className="upload-prompt" onClick={() => inputRef.current?.click()} data-testid="button-upload-photo"><span className="upload-icon"><Upload size={21} strokeWidth={1.5} /></span><strong>Drop your outfit photo here</strong><span>or <u>browse your files</u> · JPG, PNG, WebP up to 3 MB</span></button>}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(event) => acceptFile(event.target.files?.[0])} data-testid="input-outfit-photo" />
        </div>
        {fileError && <p className="field-error" role="alert" data-testid="text-photo-error">{fileError}</p>}
        <div className="form-options">
          <label className="field-label">WHERE ARE YOU HEADED? <span>OPTIONAL</span><div className="select-wrap"><select value={occasion} onChange={(event) => setOccasion(event.target.value)} data-testid="select-occasion"><option value="">Choose an occasion</option><option>Everyday</option><option>Work</option><option>Dinner</option><option>Weekend away</option><option>A special occasion</option></select><ChevronDown size={15} /></div></label>
          <label className="field-label">A STYLE MOOD? <span>OPTIONAL</span><div className="select-wrap"><select value={stylePreference} onChange={(event) => setStylePreference(event.target.value)} data-testid="select-style"><option value="">Choose a direction</option><option>Relaxed</option><option>Polished</option><option>Playful</option><option>Minimal</option><option>Unexpected</option></select><ChevronDown size={15} /></div></label>
          <button className="button-primary analyze-button" type="submit" disabled={analyze.isPending} data-testid="button-analyze">{analyze.isPending ? <><LoaderCircle size={16} className="spin" /> Finding your looks…</> : <>Style this look <ArrowRight size={16} /></>}</button>
        </div>
        {analyze.isError && <div className="inline-error" role="alert" data-testid="status-analysis-error"><CircleAlert size={17} /><span>We couldn’t analyze this photo just now. Please try again, or choose another clear outfit photo.</span></div>}
      </form>
    </section>

    {analysis && <AnalysisResults analysis={analysis} products={products} loading={productsQuery.isLoading} error={productsQuery.isError} onRetry={() => productsQuery.refetch()} />}
    {!analysis && <section className="how-it-works"><div className="how-title"><p className="eyebrow">A LITTLE MORE YOU</p><h2 className="editorial">Good style is already<br />in your closet.</h2></div><div className="how-steps"><div><span>01</span><h3>Bring a favorite</h3><p>A photo of what you have on. No packing a bag, no wardrobe audit.</p></div><div><span>02</span><h3>See it differently</h3><p>Get styling directions grounded in the pieces you’re already wearing.</p></div><div><span>03</span><h3>Finish the story</h3><p>Discover considered additions, only when something is missing.</p></div></div></section>}
  </main></Shell>;
}

function AnalysisResults({ analysis, products, loading, error, onRetry }: { analysis: { summary: string; looks: StylingLook[] }; products: Product[]; loading: boolean; error: boolean; onRetry: () => void }) {
  return <section className="analysis-results page-enter" id="your-looks">
    <div className="results-heading"><div><p className="eyebrow"><span className="eyebrow-rule" /> YOUR PERSONAL EDIT</p><h2 className="editorial">The outfit, <em>reconsidered.</em></h2><p className="results-summary" data-testid="text-analysis-summary">{analysis.summary}</p></div><span className="results-count">{analysis.looks.length} {analysis.looks.length === 1 ? 'LOOK' : 'LOOKS'} TO TRY</span></div>
    {analysis.looks.length === 0 ? <div className="empty-note"><Sparkles size={20} /><p>No looks came back for this photo. Try a brighter, full outfit image and give it another go.</p></div> : <div className="looks-list">{analysis.looks.map((look, index) => {
      const recs = products.filter((product) => look.recommendedProductIds.includes(product.id));
      return <article className="look-card" key={`${look.title}-${index}`} data-testid={`card-look-${index}`}>
        <div className="look-number">LOOK <span>0{index + 1}</span></div>
        <div className="look-main"><h3 className="editorial">{look.title}</h3><p>{look.description}</p>
          {look.missingItems.length > 0 && <div className="missing-list"><p className="mini-label">THE FINISHING TOUCHES</p>{look.missingItems.map((item, itemIndex) => <div className="missing-item" key={`${item.name}-${itemIndex}`}><span className="missing-dot" /><div><strong>{item.name}</strong><p>{item.reason}</p></div><span className="missing-category">{item.category}</span></div>)}</div>}
        </div>
        <div className="look-products">{loading ? <div className="mini-loading"><span /><span /></div> : error ? <p className="product-fetch-error">Recommendations aren’t available right now.</p> : recs.length ? recs.map((product) => <ProductCard product={product} key={product.id} />) : <div className="no-recs">No shop pieces matched this look. Your styling notes are ready to try with what you own.</div>}</div>
      </article>;
    })}</div>}
    {error && <LoadError message="Your styling is ready, but shop recommendations couldn’t be loaded." onRetry={onRetry} />}
    <button className="text-action restart-button" onClick={() => document.getElementById('styling-desk')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-style-another">Style another outfit <ArrowUpRight size={15} /></button>
  </section>;
}

function Shop() {
  const [category, setCategory] = useState<ListProductsParams['category']>();
  const params: ListProductsParams | undefined = category ? { category } : undefined;
  const query = useListProducts(params, { query: { queryKey: getListProductsQueryKey(params) } });
  return <Shell><main className="shop-page page-enter">
    <div className="shop-heading"><div><p className="eyebrow"><span className="eyebrow-rule" /> THE OUTFIT HELPER EDIT</p><h1 className="editorial">Pieces with <em>purpose.</em></h1><p>A small, considered collection for getting dressed on your own terms.</p></div><span className="shop-index">COLLECTION / 01</span></div>
    <div className="shop-toolbar"><div className="filter-tabs" role="group" aria-label="Filter products">{([{ label: 'Everything', value: undefined }, { label: 'Clothing', value: 'clothing' }, { label: 'Shoes', value: 'shoes' }] as const).map((filter) => <button key={filter.label} className={category === filter.value ? 'filter-tab active' : 'filter-tab'} onClick={() => setCategory(filter.value)} data-testid={`filter-${filter.label.toLowerCase()}`}>{filter.label}</button>)}</div><span className="results-total">{query.data?.length ?? '—'} PIECES</span></div>
    {query.isLoading ? <ProductSkeletons /> : query.isError ? <LoadError message="We couldn’t load the shop. Please check your connection and try again." onRetry={() => query.refetch()} /> : query.data?.length ? <div className="product-grid">{query.data.map((product, index) => <ProductCard product={product} index={index} key={product.id} />)}</div> : <div className="shop-empty"><ShoppingBag size={26} strokeWidth={1.2} /><h2 className="editorial">Nothing in this edit just yet.</h2><p>Try another category to see what’s available.</p><button className="text-action" onClick={() => setCategory(undefined)} data-testid="button-clear-filter">See everything <ArrowRight size={15} /></button></div>}
    <div className="shop-note"><span>GOOD THINGS, THOUGHTFULLY CHOSEN</span><p>A small shop of versatile pieces, selected to work with the wardrobe you already have.</p></div>
  </main></Shell>;
}

function ProductDetail() {
  const id = useParams<{ id: string }>()?.id ?? '';
  const query = useGetProduct(id, { query: { queryKey: getGetProductQueryKey(id), enabled: !!id } });
  const [added, setAdded] = useState(false);
  if (query.isLoading) return <Shell><main className="detail-page"><div className="detail-skeleton" /><div className="detail-skeleton-copy" /></main></Shell>;
  if (query.isError || !query.data) return <Shell><main className="detail-page"><Link href="/shop" className="back-link"><ArrowLeft size={15} /> Back to the shop</Link><LoadError message="We couldn’t find this piece. It may no longer be available." onRetry={() => query.refetch()} /></main></Shell>;
  const product = query.data;
  function addToBag() {
    saveCart([...getCart(), product.id]);
    setAdded(true);
  }
  return <Shell><main className="detail-page page-enter">
    <Link href="/shop" className="back-link" data-testid="link-back-shop"><ArrowLeft size={15} /> Back to the shop</Link>
    <div className="detail-layout"><div className="detail-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} data-testid="img-product-detail" /> : <div className="image-fallback"><Shirt size={45} strokeWidth={1} /><span>Outfit Helper edit</span></div>}<span className="detail-stamp">OH / {product.category === 'shoes' ? '02' : '01'}</span></div>
      <div className="detail-copy"><p className="eyebrow">{product.category.toUpperCase()} / THE EDIT</p><h1 className="editorial" data-testid="text-product-name">{product.name}</h1><span className="detail-price" data-testid="text-product-price">{money(product.price)}</span>{product.color && <p className="detail-color">COLOR <span>{product.color}</span></p>}<div className="detail-divider" /><p className="detail-description">{product.description}</p><button className="button-primary add-detail" onClick={addToBag} data-testid="button-add-to-bag">{added ? <><Check size={16} /> Added to your bag</> : <>Add to bag <Plus size={16} /></>}</button><p className="detail-note"><Heart size={15} /> A considered piece for wearing often.</p></div>
    </div>
  </main></Shell>;
}

function Cart() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { setIds(getCart()); }, []);
  const query = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey() } });
  const products = query.data ?? [];
  const lines = ids.map((id, index) => ({ id, index, product: products.find((product) => product.id === id) })).filter((line): line is { id: string; index: number; product: Product } => !!line.product);
  function remove(index: number) {
    const next = ids.filter((_, itemIndex) => itemIndex !== index);
    saveCart(next);
    setIds(next);
  }
  return <Shell><main className="cart-page page-enter">
    <p className="eyebrow"><span className="eyebrow-rule" /> YOUR SAVED PIECES</p><h1 className="editorial">The <em>bag.</em></h1>
    {query.isLoading ? <div className="cart-loading"><div /><div /></div> : query.isError ? <LoadError message="We couldn’t load your saved pieces. Your bag is still saved on this device." onRetry={() => query.refetch()} /> : !ids.length || !lines.length ? <div className="cart-empty"><span className="empty-bag-icon"><ShoppingBag size={28} strokeWidth={1.2} /></span><h2 className="editorial">A little room for something good.</h2><p>Your bag is empty for now. Find a piece that feels like you.</p><Link className="button-primary" href="/shop" data-testid="link-shop-empty">Explore the shop <ArrowRight size={16} /></Link></div> : <div className="cart-layout"><div className="cart-lines">{lines.map(({ id, index, product }) => <article className="cart-line" key={`${id}-${index}`} data-testid={`row-cart-${id}-${index}`}><Link href={`/products/${id}`} className="cart-line-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className="image-fallback"><Shirt size={23} /></div>}</Link><div className="cart-line-copy"><Link href={`/products/${id}`} className="cart-line-name">{product.name}</Link><span>{product.category}{product.color ? ` · ${product.color}` : ''}</span><strong>{money(product.price)}</strong></div><button className="remove-line" onClick={() => remove(index)} aria-label={`Remove ${product.name}`} data-testid={`button-remove-${id}-${index}`}><X size={17} /></button></article>)}</div><aside className="cart-aside"><p className="eyebrow">A NOTE BEFORE YOU GO</p><h2 className="editorial">A bag, not a checkout.</h2><p>These pieces are saved here for you. Online checkout and payment aren’t available yet—no payment will be taken.</p><div className="cart-total"><span>SUBTOTAL</span><strong>{money(lines.reduce((total, line) => total + line.product.price, 0))}</strong></div><button className="checkout-disabled" disabled data-testid="button-checkout-disabled"><LockKeyhole size={16} /> Checkout isn’t available</button><Link className="continue-link" href="/shop">Continue exploring <ArrowUpRight size={15} /></Link></aside></div>}
  </main></Shell>;
}

function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const [formError, setFormError] = useState('');
  const login = useLogIn();
  const signup = useSignUp();
  const queryClient = useQueryClient();
  const pending = isSignup ? signup.isPending : login.isPending;
  const failed = isSignup ? signup.isError : login.isError;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    if (!email || !email.includes('@')) {
      setFormError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setFormError('Your password must be at least 8 characters.');
      return;
    }
    const finish = (user: { id: string; name: string; email: string; createdAt: string }) => {
      queryClient.setQueryData(getGetCurrentUserQueryKey(), user);
      router.push('/');
    };
    if (isSignup) {
      const name = String(formData.get('name') ?? '').trim();
      if (!name) {
        setFormError('Tell us your name to create your account.');
        return;
      }
      signup.mutate({ data: { name, email, password } }, { onSuccess: finish });
    } else {
      login.mutate({ data: { email, password } }, { onSuccess: finish });
    }
  }
  return <Shell><main className="auth-page page-enter">
    <div className="auth-aside"><p className="eyebrow"><span className="eyebrow-rule" /> OUTFIT HELPER</p><h1 className="editorial">Personal style,<br /><em>kept personal.</em></h1><p>Your saved pieces and styling ideas, all in one place.</p><span className="auth-aside-note">A BETTER WAY TO GET DRESSED</span></div>
    <div className="auth-form-panel"><div className="auth-panel-top"><span className="eyebrow">{isSignup ? 'A PLACE FOR YOUR STYLE' : 'WELCOME BACK'}</span><span className="auth-mark">oh.</span></div><h2 className="editorial">{isSignup ? 'Make it yours.' : 'Good to see you.'}</h2><p className="auth-subtitle">{isSignup ? 'Create an account to keep your edit close.' : 'Sign in to pick up where you left off.'}</p>
      <form method="post" action={`/api/auth/${mode}`} onSubmit={submit} className="auth-form" noValidate>
        <noscript><p>Enable JavaScript to sign in securely.</p></noscript>
        {isSignup && <label className="auth-label">YOUR NAME<input name="name" type="text" autoComplete="name" placeholder="Name" required data-testid="input-name" /></label>}
        <label className="auth-label">EMAIL ADDRESS<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required data-testid="input-email" /></label>
        <label className="auth-label">PASSWORD<input name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="At least 8 characters" minLength={8} required data-testid="input-password" /></label>
        {(formError || failed) && <div className="auth-error" role="alert" data-testid="status-auth-error"><CircleAlert size={16} />{formError || `We couldn’t ${isSignup ? 'create your account' : 'sign you in'}. Check your details and try again.`}</div>}
        <button className="button-primary auth-submit" type="submit" disabled={pending || !hydrated} data-testid="button-auth-submit">{pending ? <><LoaderCircle size={16} className="spin" /> Please wait…</> : <>{isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></>}</button>
      </form>
      <p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to Outfit Helper?'} <Link href={isSignup ? '/login' : '/signup'} data-testid="link-auth-switch">{isSignup ? 'Sign in' : 'Create an account'}</Link></p>
    </div>
  </main></Shell>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const location = usePathname();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App({ page = 'home' }: { page?: 'home' | 'shop' | 'product' | 'cart' | 'login' | 'signup' }) {
  return <RoutedErrorBoundary>
    {page === 'home' ? <Home /> : page === 'shop' ? <Shop /> :
      page === 'product' ? <ProductDetail /> : page === 'cart' ? <Cart /> :
        <AuthPage mode={page} />}
  </RoutedErrorBoundary>;
}

export default App;
