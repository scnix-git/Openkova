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
        <span className="gallery__count">
          {images.length} image{images.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="gallery__grid">
        {images.map((img) => {
          const src = `/api/image/${sessionId}/${img.imageId}`;
          return (
            <div key={img.imageId} className="gallery__item">
              <div className="gallery__img-wrap">
                <img
                  src={src}
                  alt={img.label}
                  className="gallery__img"
                  loading="lazy"
                />
              </div>
              <div className="gallery__item-footer">
                <span className="gallery__item-label" title={img.label}>
                  {img.label}
                </span>
                <a
                  href={src}
                  download={`${img.imageId}.png`}
                  className="gallery__download"
                >
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
