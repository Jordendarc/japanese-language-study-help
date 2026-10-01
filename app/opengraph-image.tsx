import { ImageResponse } from 'next/og';
import { SITE_NAME } from './utils/site';

export const alt = `${SITE_NAME}: Japanese vocabulary, grammar and kanji practice`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Latin text only: the default image font has no Japanese glyphs
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 96px',
          background: '#14161c',
          color: '#e8e6e1',
        }}
      >
        <div style={{ width: 96, height: 8, background: '#8b9dff', borderRadius: 4, marginBottom: 40 }} />
        <div style={{ fontSize: 88, fontWeight: 600, letterSpacing: -2 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 40, color: '#9aa0b4', marginTop: 24 }}>
          Japanese vocabulary, grammar and kanji practice
        </div>
      </div>
    ),
    size
  );
}
