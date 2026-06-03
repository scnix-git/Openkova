'use client';

import { useState } from 'react';
import SnippetInput from './SnippetInput';
import FileInput from './FileInput';
import UrlInput from './UrlInput';
import Gallery from './Gallery';

type Tab = 'snippet' | 'files' | 'url';

export interface GalleryImage {
  imageId: string;
  label: string;
}

export interface Viewport {
  width: number;
  height: number;
  label: string;
}

const VIEWPORTS: Viewport[] = [
  { label: 'Mobile', width: 390, height: 844 },
  { label: 'Desktop', width: 1280, height: 800 },
  { label: 'Wide', width: 1920, height: 1080 },
];

interface Props {
  initialSessionId: string | null;
}

export default function ConverterTabs({ initialSessionId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('snippet');
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [viewport, setViewport] = useState<Viewport>(VIEWPORTS[1]!);
  const [fullPage, setFullPage] = useState(false);

  function handleConversionComplete(newSessionId: string, newImages: GalleryImage[]) {
    setSessionId(newSessionId);
    setImages((prev) => [...newImages, ...prev]);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'snippet', label: 'HTML Snippet' },
    { id: 'files', label: 'Files' },
    { id: 'url', label: 'URL / Crawl' },
  ];

  return (
    <div>
      <div className="converter-tabs__toolbar">
        <div className="converter-tabs__tablist" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`converter-tabs__tab${activeTab === tab.id ? ' converter-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="converter-tabs__controls">
          <button
            className={`fullpage-btn${fullPage ? ' fullpage-btn--active' : ''}`}
            onClick={() => setFullPage((p) => !p)}
            title="Capture the full scrollable page height, not just the viewport"
          >
            Full page
          </button>

          <div className="viewport-selector" role="group" aria-label="Viewport size">
            {VIEWPORTS.map((vp) => (
              <button
                key={vp.label}
                className={`viewport-selector__btn${viewport.label === vp.label ? ' viewport-selector__btn--active' : ''}`}
                onClick={() => setViewport(vp)}
                title={`${vp.width} × ${vp.height}`}
              >
                {vp.label}
                <span className="viewport-selector__dims">{vp.width}px</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'snippet' && (
        <SnippetInput sessionId={sessionId} viewport={viewport} fullPage={fullPage} onConversionComplete={handleConversionComplete} />
      )}
      {activeTab === 'files' && (
        <FileInput sessionId={sessionId} viewport={viewport} fullPage={fullPage} onConversionComplete={handleConversionComplete} />
      )}
      {activeTab === 'url' && (
        <UrlInput sessionId={sessionId} viewport={viewport} fullPage={fullPage} onConversionComplete={handleConversionComplete} />
      )}

      {images.length > 0 && sessionId && (
        <Gallery sessionId={sessionId} images={images} />
      )}
    </div>
  );
}
