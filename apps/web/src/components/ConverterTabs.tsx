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

interface Props {
  initialSessionId: string | null;
}

export default function ConverterTabs({ initialSessionId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('snippet');
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [images, setImages] = useState<GalleryImage[]>([]);

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

      {activeTab === 'snippet' && (
        <SnippetInput sessionId={sessionId} onConversionComplete={handleConversionComplete} />
      )}
      {activeTab === 'files' && (
        <FileInput sessionId={sessionId} onConversionComplete={handleConversionComplete} />
      )}
      {activeTab === 'url' && (
        <UrlInput sessionId={sessionId} onConversionComplete={handleConversionComplete} />
      )}

      {images.length > 0 && sessionId && (
        <Gallery sessionId={sessionId} images={images} />
      )}
    </div>
  );
}
