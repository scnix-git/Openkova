import Link from 'next/link';

export default function Header() {
  const githubUrl =
    process.env['OPENKOVA_GITHUB_URL'] ?? 'https://github.com/scnix-git/openkova';

  return (
    <header className="header">
      <div className="header__inner">
        <Link href="/" className="header__logo">
          open<span>kova</span>
        </Link>
        <nav className="header__nav">
          <Link href="/docs" className="header__nav-link">
            Docs
          </Link>
          <Link href="/about" className="header__nav-link">
            About
          </Link>
          <Link href="/how-it-works" className="header__nav-link">
            How it works
          </Link>
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="header__nav-link">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
