"use client";

import { useState, useEffect } from "react";

type HeroImage = {
  id: string;
  image_url: string;
  alt_text: string;
  order_index: number;
  active: boolean;
};

export default function ImageOnlySection() {
  const [image, setImage] = useState<HeroImage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImage();
  }, []);

  async function loadImage() {
    try {
      const response = await fetch("/api/hero-images");
      const data = await response.json();
      // Get first active image
      if (Array.isArray(data) && data.length > 0) {
        setImage(data[0]);
      }
    } catch (error) {
      console.error("Error loading hero image:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full">
      <div className="relative w-full h-[700px] sm:h-[800px] lg:h-[900px] flex items-center justify-center overflow-hidden">
        {image && image.image_url ? (
          <img
            src={image.image_url}
            alt={image.alt_text || "Hero image"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          /* Placeholder Image */
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--background-muted)' }}
          >
            <svg 
              className="w-32 h-32 sm:w-40 sm:h-40" 
              fill="none" 
              stroke="var(--foreground-muted)" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
          </div>
        )}
      </div>
    </section>
  );
}
