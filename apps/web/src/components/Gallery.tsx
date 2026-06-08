'use client';

import type { GalleryImage } from './ConverterTabs';

interface Props {
  sessionId: string;
  images: GalleryImage[];
}

export default function Gallery({ sessionId, images }: Props) {
  if (images.length === 0) return null;

  return (
    <div className="gallery">
      <div className="gallery__header">
        <h2 className="gallery__title">Screenshots</h2>
        <div className="gallery__header-right">
          <span className="gallery__count">
            {images.length} file{images.length !== 1 ? 's' : ''}
          </span>
          {images.length > 1 && (
            <a
              href={`/api/session/${sessionId}/download`}
              download="openkova-screenshots.zip"
              className="btn btn--ghost gallery__download-all"
            >
              Download All
            </a>
          )}
        </div>
      </div>
      <div className="gallery__grid">
        {images.map((img) => {
          const src = `/api/image/${sessionId}/${img.imageId}`;
          const isPdf = img.imageId.endsWith('.pdf');
          return (
            <div key={img.imageId} className="gallery__item">
              <div className="gallery__img-wrap">
                {isPdf ? (
                  <div className="gallery__pdf-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="12" y2="17" />
                    </svg>
                    <span>PDF</span>
                  </div>
                ) : (
                  <img src={src} alt={img.label} className="gallery__img" loading="lazy" />
                )}
              </div>
              <div className="gallery__item-footer">
                <span className="gallery__item-label" title={img.label}>
                  {img.label}
                </span>
                <a href={src} download={img.imageId} className="gallery__download">
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
