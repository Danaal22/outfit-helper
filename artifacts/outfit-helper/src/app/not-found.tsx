import Link from 'next/link';
export default function NotFound() {
  return <main className="auth-page"><div><h1 className="editorial">Page not found.</h1><p>This page doesn’t exist.</p><Link href="/">Back to Outfit Helper</Link></div></main>;
}
