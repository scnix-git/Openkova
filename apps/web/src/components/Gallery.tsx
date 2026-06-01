'use client';

import { useState } from 'react';
import type { GalleryImage } from './ConverterTabs';

interface Props {
  sessionId: string;
  images: GalleryImage[];
}

export default function Gallery({ sessionId, images }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  if (images.length === 0) return null;

  async function downloadAll() {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      for (let i = 0; i < images.length; i++) {
        const img = images[i]!;
        const src = `/api/image/${sessionId}/${img.imageId}`;
        const res = await fetch(src);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${img.imageId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        setDownloadProgress(i + 1);
        if (i < images.length - 1) await new Promise((r) => setTimeout(r, 150));
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="gallery">
      <div className="gallery__header">
        <h2 className="gallery__title">Screenshots</h2>
        <div className="gallery__header-right">
          <span className="gallery__count">
            {images.length} image{images.length !== 1 ? 's' : ''}
          </span>
          {images.length > 1 && (
            <button
              className="btn btn--ghost gallery__download-all"
              onClick={downloadAll}
              disabled={downloading}
            >
              {downloading ? `Downloading ${downloadProgress}/${images.length}…` : 'Download All'}
            </button>
          )}
        </div>
      </div>
      <div className="gallery__grid">
        {images.map((img) => {
          const src = `/api/image/${sessionId}/${img.imageId}`;
          return (
            <div key={img.imageId} className="gallery__item">
              <div className="gallery__img-wrap">
                <img src={src} alt={img.label} className="gallery__img" loading="lazy" />
              </div>
              <div className="gallery__item-footer">
                <span className="gallery__item-label" title={img.label}>
                  {img.label}
                </span>
                <a href={src} download={`${img.imageId}.png`} className="gallery__download">
                  Download
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
