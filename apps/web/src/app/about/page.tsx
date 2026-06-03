import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'About — Openkova' };

export default function AboutPage() {
  return (
    <main className="page">
      <h1 className="page__title">About Openkova</h1>
      <p className="page__subtitle">An open-source HTML-to-image platform.</p>

      <div className="prose">
        <h2>What is Openkova?</h2>
        <p>
          Openkova is a self-hostable tool for converting HTML to screenshots. It uses Puppeteer
          and headless Chromium under the hood — the same engine that powers Chrome — to produce
          pixel-accurate renders of any HTML content.
        </p>

        <h2>Use cases</h2>
        <ul>
          <li>Generating social media preview cards from HTML templates</li>
          <li>Capturing full-page screenshots of internal dashboards</li>
          <li>Archiving HTML documents as images</li>
          <li>Automated visual regression testing workflows</li>
          <li>Integrating screenshot generation into AI pipelines via MCP</li>
        </ul>

        <h2>Open source</h2>
        <p>
          Openkova is MIT licensed and built in public. Contributions, bug reports, and feature
          requests are welcome on GitHub.
        </p>

        <h2>Phase roadmap</h2>
        <ul>
          <li>
            <strong>Phase 1 (current):</strong> Web UI with snippet, file, and URL modes.
          </li>
          <li>
            <strong>Phase 2:</strong> REST API with auth, MCP server, OpenClaw skill.
          </li>
          <li>
            <strong>Phase 3:</strong> React, Vue, and Svelte component rendering.
          </li>
        </ul>
      </div>
    </main>
  );
}
